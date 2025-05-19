-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'team_member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create domains table
DROP TABLE IF EXISTS domains CASCADE;
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    manager_id UUID NOT NULL REFERENCES users(id),
    subscription_status VARCHAR(50) NOT NULL CHECK (subscription_status IN ('trial', 'active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
DROP TABLE IF EXISTS teams CASCADE;
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domains(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'team_member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain_id, user_id)
);

-- Create campaigns table
DROP TABLE IF EXISTS campaigns CASCADE;
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL,
    objective VARCHAR(100) NOT NULL,
    targeting_criteria JSONB NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
    domain_id UUID NOT NULL REFERENCES domains(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create links table
DROP TABLE IF EXISTS links CASCADE;
CREATE TABLE IF NOT EXISTS links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    utm_source VARCHAR(100) NOT NULL,
    utm_medium VARCHAR(100) NOT NULL,
    utm_campaign VARCHAR(100) NOT NULL,
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    full_url TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
DROP INDEX IF EXISTS idx_users_email;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
DROP INDEX IF EXISTS idx_domains_manager_id;
CREATE INDEX IF NOT EXISTS idx_domains_manager_id ON domains(manager_id);
DROP INDEX IF EXISTS idx_teams_domain_user;
CREATE INDEX IF NOT EXISTS idx_teams_domain_user ON teams(domain_id, user_id);
DROP INDEX IF EXISTS idx_campaigns_domain_id;
CREATE INDEX IF NOT EXISTS idx_campaigns_domain_id ON campaigns(domain_id);
DROP INDEX IF EXISTS idx_campaigns_created_by;
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
DROP INDEX IF EXISTS idx_links_campaign_id;
CREATE INDEX IF NOT EXISTS idx_links_campaign_id ON links(campaign_id);
DROP INDEX IF EXISTS idx_links_created_by;
CREATE INDEX IF NOT EXISTS idx_links_created_by ON links(created_by);

-- Create function to update updated_at timestamp
DROP FUNCTION IF EXISTS update_updated_at_column();
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_domains_updated_at ON domains;
CREATE TRIGGER update_domains_updated_at
    BEFORE UPDATE ON domains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_links_updated_at ON links;
CREATE TRIGGER update_links_updated_at
    BEFORE UPDATE ON links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- FUNCTIONS
DROP FUNCTION IF EXISTS is_domain_manager(UUID);
CREATE OR REPLACE FUNCTION is_domain_manager(domain_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM domains
        WHERE id = domain_id
        AND manager_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 