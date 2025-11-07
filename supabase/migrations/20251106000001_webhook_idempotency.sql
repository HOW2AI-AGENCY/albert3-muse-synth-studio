-- Migration: Webhook Idempotency (SEC-002)
-- Created: 2025-11-06
-- Purpose: Prevent duplicate webhook processing from external providers

-- =====================================================
-- 1. CREATE webhook_delivery_log TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Idempotency key (unique per webhook)
  webhook_id TEXT UNIQUE NOT NULL,

  -- Provider info
  provider TEXT NOT NULL CHECK (provider IN ('suno', 'mureka', 'replicate', 'other')),

  -- Related task/track
  task_id TEXT NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,

  -- Processing info
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Payload for debugging
  payload JSONB,

  -- Error tracking
  error_message TEXT,
  retry_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

-- Fast lookup by webhook_id (idempotency check)
CREATE INDEX idx_webhook_delivery_log_webhook_id
  ON webhook_delivery_log(webhook_id);

-- Fast lookup by task_id and provider
CREATE INDEX idx_webhook_delivery_log_task_provider
  ON webhook_delivery_log(task_id, provider);

-- Fast lookup by track_id
CREATE INDEX idx_webhook_delivery_log_track_id
  ON webhook_delivery_log(track_id);

-- Index for cleanup queries (delete old processed webhooks)
CREATE INDEX idx_webhook_delivery_log_created_at
  ON webhook_delivery_log(created_at)
  WHERE status = 'completed';

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE webhook_delivery_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role has full access"
  ON webhook_delivery_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own webhook logs (for debugging)
CREATE POLICY "Users can view their webhook logs"
  ON webhook_delivery_log
  FOR SELECT
  TO authenticated
  USING (
    track_id IN (
      SELECT id FROM tracks WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to check if webhook was already processed
CREATE OR REPLACE FUNCTION check_webhook_processed(
  p_webhook_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM webhook_delivery_log
    WHERE webhook_id = p_webhook_id
      AND status IN ('processing', 'completed')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register webhook delivery
CREATE OR REPLACE FUNCTION register_webhook_delivery(
  p_webhook_id TEXT,
  p_provider TEXT,
  p_task_id TEXT,
  p_track_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO webhook_delivery_log (
    webhook_id,
    provider,
    task_id,
    track_id,
    status,
    payload
  )
  VALUES (
    p_webhook_id,
    p_provider,
    p_task_id,
    p_track_id,
    'processing',
    p_payload
  )
  ON CONFLICT (webhook_id) DO NOTHING
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark webhook as completed
CREATE OR REPLACE FUNCTION complete_webhook_delivery(
  p_webhook_id TEXT,
  p_track_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE webhook_delivery_log
  SET
    status = 'completed',
    track_id = COALESCE(p_track_id, track_id),
    processed_at = NOW(),
    updated_at = NOW()
  WHERE webhook_id = p_webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark webhook as failed
CREATE OR REPLACE FUNCTION fail_webhook_delivery(
  p_webhook_id TEXT,
  p_error_message TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE webhook_delivery_log
  SET
    status = 'failed',
    error_message = p_error_message,
    retry_count = retry_count + 1,
    updated_at = NOW()
  WHERE webhook_id = p_webhook_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CLEANUP JOB (автоматическая очистка старых записей)
-- =====================================================

-- Function to cleanup old completed webhook logs (> 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS INT AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM webhook_delivery_log
  WHERE status = 'completed'
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE webhook_delivery_log IS
  'Tracks webhook deliveries from external providers (Suno, Mureka) to ensure idempotency';

COMMENT ON COLUMN webhook_delivery_log.webhook_id IS
  'Unique idempotency key (e.g., X-Delivery-Id header or generated UUID)';

COMMENT ON COLUMN webhook_delivery_log.provider IS
  'External provider name: suno, mureka, replicate, other';

COMMENT ON COLUMN webhook_delivery_log.task_id IS
  'Provider-specific task/job ID (e.g., Suno task_id)';

COMMENT ON FUNCTION check_webhook_processed IS
  'Returns true if webhook was already processed (idempotency check)';

COMMENT ON FUNCTION register_webhook_delivery IS
  'Registers new webhook delivery atomically (uses ON CONFLICT to prevent duplicates)';

COMMENT ON FUNCTION cleanup_old_webhook_logs IS
  'Deletes completed webhook logs older than 30 days';

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant execute on functions to service_role
GRANT EXECUTE ON FUNCTION check_webhook_processed TO service_role;
GRANT EXECUTE ON FUNCTION register_webhook_delivery TO service_role;
GRANT EXECUTE ON FUNCTION complete_webhook_delivery TO service_role;
GRANT EXECUTE ON FUNCTION fail_webhook_delivery TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_webhook_logs TO service_role;
