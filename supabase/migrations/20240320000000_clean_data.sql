-- Clean all data and reset tables
-- This script will remove all data and reset sequences

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Drop all data from tables
TRUNCATE TABLE links CASCADE;
TRUNCATE TABLE campaigns CASCADE;
TRUNCATE TABLE teams CASCADE;
TRUNCATE TABLE domains CASCADE;
TRUNCATE TABLE users CASCADE;

-- Reset sequences if any
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS domains_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS teams_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS campaigns_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS links_id_seq RESTART WITH 1;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify tables are empty
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM domains;
SELECT COUNT(*) FROM teams;
SELECT COUNT(*) FROM campaigns;
SELECT COUNT(*) FROM links; 




-- Verify tables are empty
DELETE TABLE users;
SELECT TABLE FROM domains;
SELECT TABLE FROM teams;
SELECT TABLE FROM campaigns;
SELECT TABLE FROM links; 