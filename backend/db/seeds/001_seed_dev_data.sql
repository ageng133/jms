-- 001_seed_dev_data.sql
-- Seed users (password: 'password123' -> bcrypt hash $2a$10$G0Vre3f2pYI5x03Jm9u1xe6cEq5M5wVf5C0Z8G1b.K4FfX4Jp2eK2)

INSERT INTO users (id, email, password_hash, full_name, affiliation, orcid_id, role)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'author@jms.org', '$2a$10$G0Vre3f2pYI5x03Jm9u1xe6cEq5M5wVf5C0Z8G1b.K4FfX4Jp2eK2', 'Dr. Alice Smith', 'Department of Computer Science, MIT', '0000-0002-1825-0097', 'AUTHOR'),
    ('22222222-2222-2222-2222-222222222222', 'editor@jms.org', '$2a$10$G0Vre3f2pYI5x03Jm9u1xe6cEq5M5wVf5C0Z8G1b.K4FfX4Jp2eK2', 'Prof. Robert Davis', 'IEEE Computer Society', '0000-0003-4567-8901', 'EDITOR'),
    ('33333333-3333-3333-3333-333333333333', 'reviewer@jms.org', '$2a$10$G0Vre3f2pYI5x03Jm9u1xe6cEq5M5wVf5C0Z8G1b.K4FfX4Jp2eK2', 'Dr. Carol White', 'Stanford AI Lab', '0000-0001-2345-6789', 'REVIEWER'),
    ('44444444-4444-4444-4444-444444444444', 'admin@jms.org', '$2a$10$G0Vre3f2pYI5x03Jm9u1xe6cEq5M5wVf5C0Z8G1b.K4FfX4Jp2eK2', 'Sysadmin JMS', 'JMS Publishing Foundation', NULL, 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Sample manuscript
INSERT INTO manuscripts (id, author_id, title, abstract, keywords, status)
VALUES 
    ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 
     'Deep Learning Approaches in Autonomous Manuscript Formatting Compliance',
     'Pre-submission desk reviews suffer from substantial overhead due to manual formatting audits. In this work, we propose a multi-stage layout parser with deep vision-language alignment.',
     ARRAY['artificial intelligence', 'document layout analysis', 'scholarly publishing'],
     'DRAFT')
ON CONFLICT (id) DO NOTHING;
