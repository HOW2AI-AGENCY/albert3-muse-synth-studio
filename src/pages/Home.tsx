/**
 * Home/Feed Page
 *
 * Main discovery page with For You, Following, and Trending tabs
 * Includes PromoBanner and ContestSection
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, TrendingUp, Heart, Sparkles } from 'lucide-react';
import { PromoBanner } from '@/components/feed/PromoBanner';
import { ContestSection } from '@/components/feed/ContestSection';
import { TrackRow } from '@/components/tracks/TrackRow';
// import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/LanguageContext';
import type { FeedTab, UITrack, ContestInfo } from '@/types/suno-ui.types';
import { logger } from '@/utils/logger';

// Mock data - replace with actual API calls
const MOCK_CONTESTS: ContestInfo[] = [
  {
    id: '1',
    title: 'Summer Vibes Remix Challenge',
    description: 'Create the ultimate summer anthem with AI-generated music',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
    deadline: '2025-12-31T23:59:59',
    prizePool: '$5,000',
    participantCount: 342,
    featured: true,
  },
  {
    id: '2',
    title: 'Lo-Fi Beats Competition',
    description: 'Produce the chillest lo-fi track of the season',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
    deadline: '2025-11-20T23:59:59',
    prizePool: '$2,500',
    participantCount: 189,
    featured: false,
  },
];

const Home = memo(() => {
  // const t = useTranslation();
  const [activeTab, setActiveTab] = useState<FeedTab>('for-you');
  const [tracks, setTracks] = useState<UITrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);

  // Load tracks based on active tab
  useEffect(() => {
    const loadTracks = async () => {
      setIsLoading(true);
      // TODO: Implement actual API calls
      // const data = await fetchTracks(activeTab);
      // setTracks(data);

      // Mock delay
      setTimeout(() => {
        setTracks([]);
        setIsLoading(false);
      }, 1000);
    };

    loadTracks();
  }, [activeTab]);

  const handleDismissBanner = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem('home-banner-dismissed', 'true');
  }, []);

  const handleSelectContest = useCallback((contestId: string) => {
    logger.info('Selected contest', 'Home', { contestId });
    // TODO: Navigate to contest details
  }, []);

  const handlePlayTrack = useCallback((trackId: string) => {
    logger.info('Play track', 'Home', { trackId });
    // TODO: Implement play functionality
  }, []);

  const handlePauseTrack = useCallback((trackId: string) => {
    logger.info('Pause track', 'Home', { trackId });
    // TODO: Implement pause functionality
  }, []);

  const handleOpenInspector = useCallback((trackId: string) => {
    logger.info('Open inspector', 'Home', { trackId });
    // TODO: Open track inspector
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Promo Banner */}
      {showBanner && (
        <PromoBanner
          title="AI Music Studio is here!"
          description="Create professional music tracks with the power of AI. Get started in seconds with simple prompts or dive deep with advanced controls."
          ctaPrimary={{
            label: 'Get Studio',
            href: '/workspace/generator',
            onClick: () => logger.debug('User clicked Get Studio CTA', 'Home'),
          }}
          ctaSecondary={{
            label: 'Learn More',
            href: '/docs',
            onClick: () => logger.debug('User clicked Learn More CTA', 'Home'),
          }}
          variant="gradient"
          onDismiss={handleDismissBanner}
        />
      )}

      {/* Feed Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FeedTab)}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Discover Music
          </h1>

          <TabsList className="hidden sm:inline-flex">
            <TabsTrigger value="for-you" className="gap-2">
              <Sparkles className="w-4 h-4" />
              For You
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              <Heart className="w-4 h-4" />
              Following
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Mobile Tabs */}
        <TabsList className="w-full sm:hidden mb-6">
          <TabsTrigger value="for-you" className="flex-1">
            <Sparkles className="w-4 h-4 mr-1" />
            For You
          </TabsTrigger>
          <TabsTrigger value="following" className="flex-1">
            <Heart className="w-4 h-4 mr-1" />
            Following
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex-1">
            <TrendingUp className="w-4 h-4 mr-1" />
            Trending
          </TabsTrigger>
        </TabsList>

        {/* For You Tab */}
        <TabsContent value="for-you" className="space-y-8 mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : tracks.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {tracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    onPlay={handlePlayTrack}
                    onPause={handlePauseTrack}
                    onOpenInspector={handleOpenInspector}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                No tracks yet
              </h3>
              <p className="text-muted-foreground">
                Start creating music to see personalized recommendations
              </p>
            </div>
          )}

          {/* Contests Section */}
          <ContestSection
            contests={MOCK_CONTESTS}
            onSelectContest={handleSelectContest}
          />
        </TabsContent>

        {/* Following Tab */}
        <TabsContent value="following" className="space-y-4 mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                No followed artists yet
              </h3>
              <p className="text-muted-foreground">
                Follow artists to see their latest tracks here
              </p>
            </div>
          )}
        </TabsContent>

        {/* Trending Tab */}
        <TabsContent value="trending" className="space-y-4 mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                Trending tracks coming soon
              </h3>
              <p className="text-muted-foreground">
                Discover what's hot in the community
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
});

Home.displayName = 'Home';

export default Home;
