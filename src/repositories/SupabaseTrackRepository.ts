/**
 * Supabase implementation of Track Repository
 */
import { supabase } from '@/integrations/supabase/client';
import type { ITrackRepository } from './interfaces/TrackRepository';
import type { Track, TrackFilters, TrackVersion, TrackStem } from '@/types/domain/track.types';
import { trackConverters } from '@/types/domain/track.types';

export class SupabaseTrackRepository implements ITrackRepository {
  async findAll(filters?: TrackFilters): Promise<Track[]> {
    let query = supabase
      .from('tracks')
      .select('*')
      .order(filters?.sortBy || 'created_at', { 
        ascending: filters?.sortOrder === 'asc' 
      });

    // Apply filters
    if (filters?.provider) {
      query = query.eq('provider', filters.provider);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.has_vocals !== undefined) {
      query = query.eq('has_vocals', filters.has_vocals);
    }
    if (filters?.is_public !== undefined) {
      query = query.eq('is_public', filters.is_public);
    }
    if (filters?.genre) {
      query = query.eq('genre', filters.genre);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,prompt.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(trackConverters.toDomain);
  }

  async findById(id: string): Promise<Track | null> {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data ? trackConverters.toDomain(data) : null;
  }

  async findByUserId(userId: string, filters?: TrackFilters): Promise<Track[]> {
    let query = supabase
      .from('tracks')
      .select('*')
      .eq('user_id', userId)
      .order(filters?.sortBy || 'created_at', { 
        ascending: filters?.sortOrder === 'asc' 
      });

    // Apply filters (same as findAll)
    if (filters?.provider) query = query.eq('provider', filters.provider);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.has_vocals !== undefined) query = query.eq('has_vocals', filters.has_vocals);
    if (filters?.genre) query = query.eq('genre', filters.genre);
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,prompt.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(trackConverters.toDomain);
  }

  async create(track: Partial<Track>): Promise<Track> {
    const { data, error } = await supabase
      .from('tracks')
      .insert([track as any])
      .select()
      .single();

    if (error) throw error;
    return trackConverters.toDomain(data);
  }

  async update(id: string, updates: Partial<Track>): Promise<Track> {
    const { data, error } = await supabase
      .from('tracks')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return trackConverters.toDomain(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async findVersions(trackId: string): Promise<TrackVersion[]> {
    const { data, error } = await supabase
      .from('track_versions')
      .select('*')
      .eq('parent_track_id', trackId)
      .order('variant_index', { ascending: true });

    if (error) throw error;
    return (data || []) as TrackVersion[];
  }

  async findStems(trackId: string): Promise<TrackStem[]> {
    const { data, error } = await supabase
      .from('track_stems')
      .select('*')
      .eq('track_id', trackId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as TrackStem[];
  }

  async incrementPlayCount(id: string): Promise<void> {
    // TEMP FIX: Read-update instead of RPC (safe, non-atomic)
    const { data: track } = await supabase
      .from('tracks')
      .select('play_count')
      .eq('id', id)
      .single();

    if (track) {
      await supabase
        .from('tracks')
        .update({ play_count: (track.play_count || 0) + 1 })
        .eq('id', id);
    }
  }

  async incrementLikeCount(id: string): Promise<void> {
    // TEMP FIX: Read-update instead of RPC (safe, non-atomic)
    const { data: track } = await supabase
      .from('tracks')
      .select('like_count')
      .eq('id', id)
      .single();

    if (track) {
      await supabase
        .from('tracks')
        .update({ like_count: (track.like_count || 0) + 1 })
        .eq('id', id);
    }
  }

  async decrementLikeCount(id: string): Promise<void> {
    // TEMP FIX: Read-update instead of RPC (safe, non-atomic)
    const { data: track } = await supabase
      .from('tracks')
      .select('like_count')
      .eq('id', id)
      .single();

    if (track) {
      await supabase
        .from('tracks')
        .update({ like_count: Math.max((track.like_count || 0) - 1, 0) })
        .eq('id', id);
    }
  }

  subscribe(trackId: string, callback: (track: Track) => void): () => void {
    const channel = supabase
      .channel(`track-${trackId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tracks',
          filter: `id=eq.${trackId}`,
        },
        (payload) => {
          const updatedTrack = trackConverters.toDomain(payload.new as any);
          callback(updatedTrack);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
