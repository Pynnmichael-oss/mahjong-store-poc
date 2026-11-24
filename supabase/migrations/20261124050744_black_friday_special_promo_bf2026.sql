-- Phase 1: Black Friday Special (promo_bf2026) schema support
--
-- Applied to project jdmxgrywtldyrozuvfvj as migration
-- 20261124050744_black_friday_special_promo_bf2026.
--
-- One-time $357 prepaid 6-month Dragon Pass. NOT a Square subscription and it
-- does NOT auto-renew: the grant is just profiles.membership_type = 'dragon_pass'
-- plus membership_expires_at, reverted by a nightly pg_cron job.
--
-- Note: profiles.subscription_id stays NULL for promo buyers, which is what keeps
-- square-webhook from ever touching these rows (all three of its handlers filter
-- on subscription_id).

-- 1. Promo expiry marker on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz NULL;

-- 2. Extend payments.payment_type CHECK to admit 'promo_bf2026'.
--    Required: the pre-existing CHECK omitted it and would reject the insert
--    made by the purchase-bf-special Edge Function.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type = ANY (ARRAY[
    'membership','session','walk_in_fee','event','refund','overage','guest_seat','promo_bf2026'
  ]::text[]));

-- 3. Extend billing_alerts.issue_type CHECK to admit 'promo_unfulfilled'.
--    Required: without it the "charge succeeded but DB write failed" fallback
--    alert would itself fail, losing the only record of the problem.
ALTER TABLE billing_alerts DROP CONSTRAINT IF EXISTS billing_alerts_issue_type_check;
ALTER TABLE billing_alerts ADD CONSTRAINT billing_alerts_issue_type_check
  CHECK (issue_type = ANY (ARRAY[
    'orphan','duplicate_seat','promo_unfulfilled'
  ]::text[]));

-- 4. At most one completed BF purchase per user. Backstop to the deterministic
--    Square idempotency key (bf2026-${user_id}) in the Edge Function.
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_bf2026_per_user
  ON payments(user_id)
  WHERE payment_type = 'promo_bf2026' AND status = 'completed';

-- 5. Nightly expiry: revert lapsed promo members to the free tier.
--    Skips anyone who has since taken a real subscription (subscription_id) or
--    is comped (unlimited_free_booking), so neither is clobbered.
CREATE OR REPLACE FUNCTION public.expire_promo_memberships()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE profiles
       SET membership_type       = 'four_winds_member'::membership_type,
           membership_expires_at = NULL,
           updated_at            = now()
     WHERE membership_expires_at IS NOT NULL
       AND membership_expires_at < now()
       AND subscription_id IS NULL
       AND unlimited_free_booking = false
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;

-- SECURITY DEFINER grants EXECUTE to PUBLIC by default; drop that RPC surface.
-- pg_cron runs as postgres, so the scheduled job is unaffected.
REVOKE ALL ON FUNCTION public.expire_promo_memberships() FROM PUBLIC, anon, authenticated;

-- 6. Daily at 06:15 UTC = 12:15am CST / 1:15am CDT.
--    cron.timezone is GMT on this project (verified), so the schedule is in UTC.
SELECT cron.schedule(
  'expire-promo-memberships',
  '15 6 * * *',
  $job$SELECT public.expire_promo_memberships()$job$
);
