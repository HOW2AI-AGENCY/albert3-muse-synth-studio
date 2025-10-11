import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { verifyWebhookSignature } from "../_shared/webhook-verify.ts";

Deno.test("verifyWebhookSignature - should verify valid signature", async () => {
  const secret = "test-secret-key";
  const body = JSON.stringify({ taskId: "test-123", status: "SUCCESS" });
  
  // Manually compute HMAC for testing
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  const isValid = await verifyWebhookSignature(body, base64Signature, secret);
  assertEquals(isValid, true);
});

Deno.test("verifyWebhookSignature - should reject invalid signature", async () => {
  const secret = "test-secret-key";
  const body = JSON.stringify({ taskId: "test-123", status: "SUCCESS" });
  const invalidSignature = "invalid-signature-base64";
  
  const isValid = await verifyWebhookSignature(body, invalidSignature, secret);
  assertEquals(isValid, false);
});

Deno.test("verifyWebhookSignature - should reject wrong secret", async () => {
  const correctSecret = "correct-secret";
  const wrongSecret = "wrong-secret";
  const body = JSON.stringify({ taskId: "test-123" });
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(correctSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  // Try to verify with wrong secret
  const isValid = await verifyWebhookSignature(body, base64Signature, wrongSecret);
  assertEquals(isValid, false);
});
