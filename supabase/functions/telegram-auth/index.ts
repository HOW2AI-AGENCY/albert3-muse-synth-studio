/**
 * Telegram Web App Authentication Handler
 * Verifies Telegram initData and creates/authenticates Supabase users
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logger } from '../_shared/logger.ts';
// Using Web Crypto API for HMAC verification

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
 * Verify Telegram initData using Web Crypto HMAC-SHA256
 */
async function verifyTelegramInitData(initData: string, botToken: string): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(initData);
    const providedHash = urlParams.get('hash');
    if (!providedHash) return false;

    // Remove hash from params
    urlParams.delete('hash');

    // Sort params alphabetically and create data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const enc = new TextEncoder();

    // secret_key = HMAC_SHA256(key="WebAppData", data=botToken)
    const webAppKey = await crypto.subtle.importKey(
      'raw',
      enc.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const secretRaw = await crypto.subtle.sign('HMAC', webAppKey, enc.encode(botToken));

    // calculated_hash = HMAC_SHA256(key=secret_key, data=data_check_string)
    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretRaw,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const calcRaw = await crypto.subtle.sign('HMAC', secretKey, enc.encode(dataCheckString));

    const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const calculatedHash = toHex(calcRaw);

    // Compare case-insensitive
    return calculatedHash.toLowerCase() === providedHash.toLowerCase();
  } catch (error) {
    logger.error('Telegram initData verification error', error instanceof Error ? error : new Error(String(error)), 'telegram-auth');
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
      logger.error('TELEGRAM_BOT_TOKEN not configured', new Error('Environment variable missing'), 'telegram-auth');
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

    logger.info('Verifying Telegram user', 'telegram-auth', {
      telegramId: user.id,
      firstName: user.first_name,
      username: user.username
    });

    // Verify initData signature
    const isValid = await verifyTelegramInitData(initData, botToken);
    if (!isValid) {
      logger.error('Invalid Telegram initData signature', new Error('HMAC verification failed'), 'telegram-auth', {
        telegramId: user.id
      });
      return new Response(
        JSON.stringify({ error: 'Invalid authentication data' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Telegram initData verified successfully', 'telegram-auth', { telegramId: user.id });

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
      logger.info('Existing Telegram user found', 'telegram-auth', {
        userId: telegramUser.id,
        telegramId: user.id
      });
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
      logger.info('Creating new Telegram user', 'telegram-auth', { telegramId: user.id });

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
        logger.error('Telegram user creation failed', createError || new Error('User creation failed'), 'telegram-auth', {
          telegramId: user.id
        });
        return new Response(
          JSON.stringify({ error: 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      logger.info('Telegram user created successfully', 'telegram-auth', {
        userId,
        telegramId: user.id
      });
    }

    // Generate session token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (sessionError || !sessionData) {
      logger.error('Session generation failed', sessionError || new Error('Session generation failed'), 'telegram-auth', {
        userId
      });
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
      logger.error('Telegram user sign in failed', signInError || new Error('Sign in failed'), 'telegram-auth', {
        userId
      });
      return new Response(
        JSON.stringify({ error: 'Failed to sign in' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Telegram authentication successful', 'telegram-auth', {
      userId,
      telegramId: user.id
    });

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
    logger.error('❌ [TELEGRAM-AUTH] Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
