-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    -- Users table policies
    DROP POLICY IF EXISTS "Users can view their own profile" ON users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON users;
    DROP POLICY IF EXISTS "Service role can insert users" ON users;
    DROP POLICY IF EXISTS "Users can view their own data" ON users;
    DROP POLICY IF EXISTS "Users can update their own data" ON users;

    -- Domains table policies
    DROP POLICY IF EXISTS "Users can view domains they manage" ON domains;
    DROP POLICY IF EXISTS "Users can create domains" ON domains;
    DROP POLICY IF EXISTS "Managers can update their domains" ON domains;
    DROP POLICY IF EXISTS "Managers can view their domains" ON domains;

    -- Teams table policies
    DROP POLICY IF EXISTS "Users can view teams they are part of" ON teams;
    DROP POLICY IF EXISTS "Domain managers can manage team members" ON teams;
    DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
    DROP POLICY IF EXISTS "Managers can manage teams" ON teams;

    -- Campaigns table policies
    DROP POLICY IF EXISTS "Users can view campaigns in their domains" ON campaigns;
    DROP POLICY IF EXISTS "Users can create campaigns in their domains" ON campaigns;
    DROP POLICY IF EXISTS "Users can update campaigns in their domains" ON campaigns;
    DROP POLICY IF EXISTS "Users can update their own campaigns" ON campaigns;

    -- Links table policies
    DROP POLICY IF EXISTS "Users can view links in their campaigns" ON links;
    DROP POLICY IF EXISTS "Users can create links in their campaigns" ON links;
    DROP POLICY IF EXISTS "Users can update links in their campaigns" ON links;
    DROP POLICY IF EXISTS "Users can view links in their domains" ON links;
    DROP POLICY IF EXISTS "Users can create links for their campaigns" ON links;
    DROP POLICY IF EXISTS "Users can update their own links" ON links;
END $$;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS is_domain_manager(UUID);
DROP FUNCTION IF EXISTS is_team_member(UUID);

-- Users table policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Service role can insert users"
    ON users FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Domains table policies
CREATE POLICY "Users can view domains they manage"
    ON domains FOR SELECT
    USING (auth.uid() = manager_id);

CREATE POLICY "Users can create domains"
    ON domains FOR INSERT
    WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update their domains"
    ON domains FOR UPDATE
    USING (auth.uid() = manager_id);

-- Teams table policies
CREATE POLICY "Users can view their own team entries"
    ON teams FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Managers can view teams in their domains"
    ON teams FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM domains
            WHERE id = teams.domain_id
            AND manager_id = auth.uid()
        )
    );

CREATE POLICY "Managers can manage teams"
    ON teams FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM domains
            WHERE id = teams.domain_id
            AND manager_id = auth.uid()
        )
    );

-- Campaigns table policies
CREATE POLICY "Users can view campaigns in their domains"
    ON campaigns FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.domain_id = campaigns.domain_id
            AND teams.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create campaigns in their domains"
    ON campaigns FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.domain_id = campaigns.domain_id
            AND teams.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own campaigns"
    ON campaigns FOR UPDATE
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM teams
            WHERE teams.domain_id = campaigns.domain_id
            AND teams.user_id = auth.uid()
            AND teams.role = 'manager'
        )
    );

-- Links table policies
CREATE POLICY "Users can view links in their domains"
    ON links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM campaigns c
            JOIN teams t ON t.domain_id = c.domain_id
            WHERE c.id = links.campaign_id
            AND t.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create links for their campaigns"
    ON links FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM campaigns c
            JOIN teams t ON t.domain_id = c.domain_id
            WHERE c.id = links.campaign_id
            AND t.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own links"
    ON links FOR UPDATE
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM campaigns c
            JOIN teams t ON t.domain_id = c.domain_id
            WHERE c.id = links.campaign_id
            AND t.user_id = auth.uid()
            AND t.role = 'manager'
        )
    );

-- Create function to check if user is a domain manager
CREATE OR REPLACE FUNCTION is_domain_manager(p_domain_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM domains
        WHERE id = p_domain_id
        AND manager_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is a team member
CREATE OR REPLACE FUNCTION is_team_member(p_domain_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM teams
        WHERE domain_id = p_domain_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 