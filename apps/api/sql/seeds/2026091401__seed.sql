BEGIN;

-- 1,000 users
INSERT INTO users (id, username, password)
SELECT gen_random_uuid()::text, 'load_user_' || i, 'x'
FROM generate_series(1, 1000) i;

-- 50 chats per user = 50k chats
INSERT INTO chats (id, user_id, title)
SELECT gen_random_uuid()::text, u.id, 'chat ' || g
FROM users u, generate_series(1, 50) g
WHERE u.username LIKE 'load_user_%';

-- 40 messages per chat = 2M messages spread over a year
INSERT INTO messages (id, chat_id, created_at)
SELECT gen_random_uuid()::text, c.id, now() - random() * interval '365 days'
FROM chats c, generate_series(1, 40) g;

INSERT INTO text_messages (id, message_id, content)
SELECT gen_random_uuid()::text, m.id, md5(random()::text)
FROM messages m;

-- about 30% of messages resolved
INSERT INTO message_resolutions (id, message_id, created_at)
SELECT gen_random_uuid()::text, m.id, m.created_at + interval '1 day'
FROM messages m
WHERE random() < 0.3;

COMMIT;

ANALYZE;  -- refresh planner statistics after a bulk load
