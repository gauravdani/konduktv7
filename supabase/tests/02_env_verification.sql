-- Verify environment variables and database connection
DO $$
BEGIN
    -- Test database connection
    RAISE NOTICE 'Testing database connection...';
    
    -- Verify UUID extension
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
    ) THEN
        RAISE EXCEPTION 'UUID extension is not installed';
    END IF;
    
    -- Verify tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Users table does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'domains') THEN
        RAISE EXCEPTION 'Domains table does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        RAISE EXCEPTION 'Teams table does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaigns') THEN
        RAISE EXCEPTION 'Campaigns table does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'links') THEN
        RAISE EXCEPTION 'Links table does not exist';
    END IF;
    
    -- Verify RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'users' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS is not enabled on users table';
    END IF;
    
    -- Verify indexes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' 
        AND indexname = 'idx_users_email'
    ) THEN
        RAISE EXCEPTION 'Users email index does not exist';
    END IF;
    
    -- Verify triggers
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_users_updated_at'
    ) THEN
        RAISE EXCEPTION 'Users updated_at trigger does not exist';
    END IF;
    
    RAISE NOTICE 'All environment verifications passed successfully!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Environment verification failed: %', SQLERRM;
        RAISE;
END $$; 