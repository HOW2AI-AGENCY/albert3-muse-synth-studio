/**
 * Telegram Web App Authentication Handler
 * Verifies Telegram initData and creates/authenticates Supabase users
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

interface RequestBody {
  initData: string;
  user: TelegramUser;
}

/**
 * Verify Telegram initData using HMAC-SHA256
 */
function verifyTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    if (!hash) return false;
    
    // Remove hash from params
    urlParams.delete('hash');
    
    // Sort params alphabetically and create data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Create secret key from bot token
    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    
    // Create HMAC hash
    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('❌ [TELEGRAM-AUTH] Verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('❌ [TELEGRAM-AUTH] TELEGRAM_BOT_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { initData, user }: RequestBody = await req.json();

    if (!initData || !user) {
      return new Response(
        JSON.stringify({ error: 'Missing initData or user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔐 [TELEGRAM-AUTH] Verifying user: ${user.id} (${user.first_name})`);

    // Verify initData signature
    const isValid = verifyTelegramInitData(initData, botToken);
    if (!isValid) {
      console.error('❌ [TELEGRAM-AUTH] Invalid initData signature');
      return new Response(
        JSON.stringify({ error: 'Invalid authentication data' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [TELEGRAM-AUTH] InitData verified');

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create email from Telegram ID
    const email = `telegram_${user.id}@telegram.local`;
    const password = `tg_${user.id}_${botToken.slice(-10)}`; // Deterministic password

    // Try to find existing user
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const telegramUser = existingUser?.users?.find(u => u.email === email);

    let userId: string;

    if (telegramUser) {
      console.log(`♻️ [TELEGRAM-AUTH] Existing user found: ${telegramUser.id}`);
      userId = telegramUser.id;

      // Update user metadata
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          telegram_id: user.id,
          telegram_username: user.username,
          telegram_first_name: user.first_name,
          telegram_last_name: user.last_name,
          telegram_photo_url: user.photo_url,
          telegram_language_code: user.language_code,
          last_telegram_login: new Date().toISOString(),
        },
      });
    } else {
      console.log(`🆕 [TELEGRAM-AUTH] Creating new user`);

      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm Telegram users
        user_metadata: {
          telegram_id: user.id,
          telegram_username: user.username,
          telegram_first_name: user.first_name,
          telegram_last_name: user.last_name,
          telegram_photo_url: user.photo_url,
          telegram_language_code: user.language_code,
          created_via_telegram: true,
          created_at: new Date().toISOString(),
        },
      });

      if (createError || !newUser.user) {
        console.error('❌ [TELEGRAM-AUTH] User creation failed:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log(`✅ [TELEGRAM-AUTH] User created: ${userId}`);
    }

    // Generate session token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (sessionError || !sessionData) {
      console.error('❌ [TELEGRAM-AUTH] Session generation failed:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sign in to get tokens
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      console.error('❌ [TELEGRAM-AUTH] Sign in failed:', signInError);
      return new Response(
        JSON.stringify({ error: 'Failed to sign in' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎉 [TELEGRAM-AUTH] Authentication successful for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          user: {
            id: userId,
            email,
            telegram_id: user.id,
            telegram_username: user.username,
            telegram_first_name: user.first_name,
            telegram_photo_url: user.photo_url,
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ [TELEGRAM-AUTH] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
