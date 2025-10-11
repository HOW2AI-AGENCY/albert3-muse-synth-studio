import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

/**
 * Verifies webhook signature using HMAC-SHA256
 * @param body - The raw request body as string
 * @param signature - The signature from X-Suno-Signature header
 * @param secret - The webhook secret from environment
 * @returns true if signature is valid
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    
    // Import secret as HMAC key
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Generate expected signature
    const expectedSig = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );
    
    // Decode received signature from base64
    const receivedSig = Uint8Array.from(
      atob(signature),
      c => c.charCodeAt(0)
    );
    
    // Timing-safe comparison
    return timingSafeEqual(
      new Uint8Array(expectedSig),
      receivedSig
    );
  } catch (error) {
    console.error('🔴 [WEBHOOK] Signature verification error:', error);
    return false;
  }
}

/**
 * Timing-safe equality check to prevent timing attacks
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}
