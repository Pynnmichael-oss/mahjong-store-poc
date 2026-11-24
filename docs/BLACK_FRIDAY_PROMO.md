# Black Friday Special (`promo_bf2026`)

One-time **$357 prepaid** purchase granting **6 months of Dragon Pass**.
Not a subscription. Not in the Square catalog. Does not auto-renew — there is
nothing for the customer to cancel.

Verified end-to-end against production Square on 2026-11-24.

---

## 1. How it works

| Piece | Where |
|---|---|
| Purchase endpoint | `supabase/functions/purchase-bf-special/index.ts` |
| Client gate (cosmetic) | `src/lib/promo.js` |
| Service call | `src/services/promoService.js` |
| Purchase card (dashboard + profile) | `src/components/ui/BlackFridaySpecialCard.jsx` |
| Public marketing banner (`/`) | `src/components/ui/BlackFridayPromoBanner.jsx` |
| Signup plan option | `src/pages/auth/SignupPage.jsx` |
| Schema + expiry job | `supabase/migrations/20261124050744_black_friday_special_promo_bf2026.sql` |

**Flow.** The client shows the offer only when the window is open and the profile
looks eligible; this is cosmetic. `purchase-bf-special` re-checks everything
server-side, charges $357 (a server constant — the amount is never accepted from
the client), inserts a `payments` row with `payment_type='promo_bf2026'`, then
sets `membership_type='dragon_pass'` and `membership_expires_at` to six months
out. A partial unique index (`payments_one_bf2026_per_user`) makes a second
completed purchase impossible at the database level.

**Expiry.** The `expire-promo-memberships` pg_cron job runs daily at 06:15 UTC
(12:15am Chicago CST). It reverts expired members to `four_winds_member`, but
only when `subscription_id IS NULL` and `unlimited_free_booking = false`, so it
can never downgrade a paying subscriber or a comp account.

**Guards.** `create-subscription` refuses to run while a promo term is live
("Your Black Friday Special is active until …") so a customer cannot double-pay,
and it clears `membership_expires_at` on success. Staff tier changes in
`MemberDetailModal` clear the marker, but only when the tier actually changes.

---

## 2. Configuration

Two independent sets of variables. **Both must agree**, or the offer appears and
then every purchase is rejected.

**Supabase** (Project Settings → Edge Functions → Secrets). Read at invocation —
no redeploy needed:
```
PROMO_BF_ENABLED  true
PROMO_STARTS_AT   2026-11-27T06:00:00Z
PROMO_ENDS_AT     2026-11-28T05:59:59Z
```

**Netlify** (Site configuration → Environment variables). Inlined by Vite **at
build time — a change does nothing until a rebuild runs**:
```
VITE_PROMO_BF_ENABLED  true
VITE_PROMO_STARTS_AT   2026-11-27T06:00:00Z
VITE_PROMO_ENDS_AT     2026-11-28T05:59:59Z
```

`2026-11-27T06:00:00Z` is midnight Friday in Chicago (CST, UTC−6) and
`2026-11-28T05:59:59Z` is 11:59:59pm the same day — a true single calendar day.

The gate **fails closed**: a missing bound, an unparseable date, a missing flag,
or `TRUE` instead of `true` all hide the offer.

### Verifying configuration without the UI

Probe the endpoint — the error text identifies the state precisely:

| Response | Meaning |
|---|---|
| `400 … has not started yet. It runs on November 27 only.` | Armed, waiting. **This is the correct pre-Friday state.** |
| `400 … is not currently available.` | Flag off, or window vars missing/unparseable |
| `400 … has ended.` | Window closed |
| `401 Unauthorized` | Gate **passed** — the window is open right now |

```bash
curl -s -X POST 'https://jdmxgrywtldyrozuvfvj.supabase.co/functions/v1/purchase-bf-special' \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" -H 'Content-Type: application/json' -d '{}'
```

Confirm the **client** side by reading the live bundle — the timestamps are
compiled in, so this proves what the deployed site actually believes:
```bash
B=$(curl -s https://fourwindstulsa.com/ | grep -o 'assets/index-[^"]*\.js' | head -1)
curl -s "https://fourwindstulsa.com/$B" | grep -o '2026-11-[0-9T:.Z-]*' | sort -u
```
No output means the variables were missing at build time and **the offer is
hidden regardless of what the dashboard shows.**

---

## 3. The idempotency dead end — the most important thing here

The Square idempotency key is **deterministic**: `bf2026-${user_id}`.

**A customer whose card declines is permanently locked out.** Confirmed in
production on 2026-11-24 — a retry with a different card returned:

> `Different request parameters used for the same idempotency_key: bf2026-96d56a84-…`

This is not recoverable by the customer. A new card produces a different
`source_id`, which Square rejects as a reused key. The only paths are a
different account or a manual staff grant.

Consequences:

- **Never test with a real member's account.** One attempt — successful *or*
  declined — burns that account's ability to purchase forever.
- A refund frees the database (the unique index only matches
  `status='completed'`) but **not** Square's key.
- A decline during **signup** leaves a created account stranded on
  `four_winds_member`. The signup flow deliberately does **not** offer "try
  another card", because that advice is false; it tells the customer staff will
  finish the purchase.

### Manual grant (the recovery path)

There is no staff UI for this yet. Six months from now, in Chicago terms:

```sql
UPDATE profiles
   SET membership_type       = 'dragon_pass'::membership_type,
       membership_expires_at = ((now() AT TIME ZONE 'America/Chicago')
                                 + interval '6 months') AT TIME ZONE 'America/Chicago',
       updated_at            = now()
 WHERE email = '<customer email>'
   AND subscription_id IS NULL;          -- never clobber a paying subscriber
```

Do **not** grant it with the staff tier dropdown: that sets a *permanent*
Dragon Pass with no expiry and gives away far more than six months.

---

## 4. Monitoring

A successful charge whose database write fails produces a `promo_unfulfilled`
alert — the customer has paid and received nothing. The email digest only runs
at **3pm Chicago**, so during the promo check directly:

```sql
SELECT user_id, detail->>'square_payment_id' AS square_payment_id,
       detail->>'stage' AS failed_at, detected_at
FROM billing_alerts
WHERE issue_type = 'promo_unfulfilled' AND notified = false;
```

Resolve with the manual grant above. The charge already succeeded — **never
re-charge.**

---

## 5. Eligibility

Blocked when any of these hold (enforced server-side, mirrored client-side):

- `subscription_id` is not null — an active **or lapsed** subscriber. Note
  `cancel-subscription` never nulls `subscription_id`, so **former** subscribers
  are permanently ineligible.
- `membership_expires_at` is already set
- `unlimited_free_booking = true` (comp/staff accounts)
- a completed `promo_bf2026` payment already exists

As of 2026-11-24: 453 of 470 customers eligible, 15 blocked by a subscription,
2 comp accounts. **Current subscribers cannot buy this** — exclude them from
promo emails or they will be advertised something they cannot purchase.

---

## 6. Testing notes

- **There is no Square sandbox configured. Every charge is real money.**
  `4111 1111 1111 1111` fails in production with `PAN_FAILURE` — that error
  means a test card was used, not that the code is broken.
- Use a throwaway account, and remember it is burned afterwards.
- Regression suite: `/private/tmp/.../signup_promo_regression.mjs` (scratch, not
  committed) extracts the real `PLANS` array and the real promo gate from source
  and asserts 40 properties — plan routing, enum safety, window gating,
  fail-closed behavior and copy. Worth recreating if the promo is reused.

### Verified behavior, 2026-11-24

- Charge `ayfMHO8SY9Zy6eFS9O8ZMsfTlTDZY`, $357.00, purchased 09:31 Chicago →
  expiry `2027-05-24 09:31` Chicago. Six months to the minute, with the UTC
  offset correctly shifting −6 → −5 across DST.
- A declined attempt wrote **no** payment row and **no** alert, which is
  correct: the alert path only fires after a *successful* charge.

---

## 7. Reusing this for another promo

Do not re-open `promo_bf2026`. Anyone who purchased or was declined is
permanently blocked by the unique index and the idempotency key. Instead:

1. Add a new `payment_type` and widen the `payments_payment_type_check`
   constraint **first** — the insert fails otherwise.
2. Add a matching partial unique index.
3. Use a new deterministic key prefix, or accept a client-supplied attempt
   counter so a declined customer can retry. **Strongly recommended** — the
   fixed key is the single biggest flaw in this design.
4. Add a rendered section to `send-billing-alerts` for any new `issue_type`.
