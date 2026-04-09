-- ============================================================
-- MAHJONG STORE POC — SEED DATA
-- Run this in Supabase SQL Editor
-- Password for all users: password123
-- ============================================================

-- 1. AUTH USERS
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud
) VALUES
  (
    'aaaaaaaa-0001-0001-0001-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'sarah.johnson@example.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  ),
  (
    'aaaaaaaa-0002-0002-0002-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'mike.chen@example.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  ),
  (
    'aaaaaaaa-0003-0003-0003-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'linda.park@example.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  ),
  (
    'aaaaaaaa-0004-0004-0004-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'james.wu@example.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  ),
  (
    'aaaaaaaa-0005-0005-0005-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'employee@mahjongstore.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- 2. IDENTITY RECORDS (required for email login)
INSERT INTO auth.identities (
  id, user_id, provider_id, provider,
  identity_data, created_at, updated_at, last_sign_in_at
) VALUES
  (
    'aaaaaaaa-0001-0001-0001-000000000001',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'sarah.johnson@example.com',
    'email',
    '{"sub":"aaaaaaaa-0001-0001-0001-000000000001","email":"sarah.johnson@example.com"}',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0002-0002-0002-000000000002',
    'aaaaaaaa-0002-0002-0002-000000000002',
    'mike.chen@example.com',
    'email',
    '{"sub":"aaaaaaaa-0002-0002-0002-000000000002","email":"mike.chen@example.com"}',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0003-0003-0003-000000000003',
    'aaaaaaaa-0003-0003-0003-000000000003',
    'linda.park@example.com',
    'email',
    '{"sub":"aaaaaaaa-0003-0003-0003-000000000003","email":"linda.park@example.com"}',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0004-0004-0004-000000000004',
    'aaaaaaaa-0004-0004-0004-000000000004',
    'james.wu@example.com',
    'email',
    '{"sub":"aaaaaaaa-0004-0004-0004-000000000004","email":"james.wu@example.com"}',
    now(), now(), now()
  ),
  (
    'aaaaaaaa-0005-0005-0005-000000000005',
    'aaaaaaaa-0005-0005-0005-000000000005',
    'employee@mahjongstore.com',
    'email',
    '{"sub":"aaaaaaaa-0005-0005-0005-000000000005","email":"employee@mahjongstore.com"}',
    now(), now(), now()
  )
ON CONFLICT (id) DO NOTHING;

-- 3. PROFILES
INSERT INTO profiles (id, full_name, email, role, membership_type, is_active)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 'Sarah Johnson',  'sarah.johnson@example.com',   'customer', 'subscriber', true),
  ('aaaaaaaa-0002-0002-0002-000000000002', 'Mike Chen',      'mike.chen@example.com',       'customer', 'subscriber', true),
  ('aaaaaaaa-0003-0003-0003-000000000003', 'Linda Park',     'linda.park@example.com',      'customer', 'walk_in',    true),
  ('aaaaaaaa-0004-0004-0004-000000000004', 'James Wu',       'james.wu@example.com',        'customer', 'walk_in',    true),
  ('aaaaaaaa-0005-0005-0005-000000000005', 'Store Employee', 'employee@mahjongstore.com',   'employee', 'walk_in',    true)
ON CONFLICT (id) DO NOTHING;

-- 4. SESSIONS (next 7 days, two per day: afternoon + evening)
INSERT INTO sessions (id, date, start_time, end_time, total_seats, status)
VALUES
  -- Today
  ('bb000001-0000-0000-0000-000000000001', CURRENT_DATE,     '13:00:00', '17:00:00', 8, 'open'),
  ('bb000002-0000-0000-0000-000000000002', CURRENT_DATE,     '18:00:00', '22:00:00', 8, 'open'),
  -- Tomorrow
  ('bb000003-0000-0000-0000-000000000003', CURRENT_DATE + 1, '13:00:00', '17:00:00', 8, 'open'),
  ('bb000004-0000-0000-0000-000000000004', CURRENT_DATE + 1, '18:00:00', '22:00:00', 8, 'open'),
  -- Day 3
  ('bb000005-0000-0000-0000-000000000005', CURRENT_DATE + 2, '13:00:00', '17:00:00', 8, 'open'),
  ('bb000006-0000-0000-0000-000000000006', CURRENT_DATE + 2, '18:00:00', '22:00:00', 8, 'open'),
  -- Day 4
  ('bb000007-0000-0000-0000-000000000007', CURRENT_DATE + 3, '13:00:00', '17:00:00', 8, 'open'),
  ('bb000008-0000-0000-0000-000000000008', CURRENT_DATE + 3, '18:00:00', '22:00:00', 8, 'open'),
  -- Day 5
  ('bb000009-0000-0000-0000-000000000009', CURRENT_DATE + 4, '10:00:00', '14:00:00', 8, 'open'),
  ('bb000010-0000-0000-0000-000000000010', CURRENT_DATE + 4, '18:00:00', '22:00:00', 8, 'open'),
  -- Day 6
  ('bb000011-0000-0000-0000-000000000011', CURRENT_DATE + 5, '10:00:00', '14:00:00', 8, 'open'),
  ('bb000012-0000-0000-0000-000000000012', CURRENT_DATE + 5, '15:00:00', '19:00:00', 8, 'open'),
  -- Day 7
  ('bb000013-0000-0000-0000-000000000013', CURRENT_DATE + 6, '13:00:00', '17:00:00', 8, 'open'),
  ('bb000014-0000-0000-0000-000000000014', CURRENT_DATE + 6, '18:00:00', '22:00:00', 8, 'open')
ON CONFLICT (id) DO NOTHING;

-- 5. SEATS (8 per session)
INSERT INTO seats (session_id, seat_number, status)
SELECT s.id, n.seat_number, 'available'
FROM sessions s
CROSS JOIN (
  SELECT generate_series(1, 8) AS seat_number
) n
ON CONFLICT DO NOTHING;
