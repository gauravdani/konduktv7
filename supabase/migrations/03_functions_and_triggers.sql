-- Function to validate UTM parameters
CREATE OR REPLACE FUNCTION validate_utm_parameters()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if utm_source is not empty
    IF NEW.utm_source IS NULL OR NEW.utm_source = '' THEN
        RAISE EXCEPTION 'utm_source cannot be empty';
    END IF;

    -- Check if utm_medium is not empty
    IF NEW.utm_medium IS NULL OR NEW.utm_medium = '' THEN
        RAISE EXCEPTION 'utm_medium cannot be empty';
    END IF;

    -- Check if utm_campaign is not empty
    IF NEW.utm_campaign IS NULL OR NEW.utm_campaign = '' THEN
        RAISE EXCEPTION 'utm_campaign cannot be empty';
    END IF;

    -- Validate URL format
    IF NEW.full_url IS NULL OR NEW.full_url = '' THEN
        RAISE EXCEPTION 'full_url cannot be empty';
    END IF;

    -- Check if URL is properly formatted
    IF NOT NEW.full_url ~ '^https?://' THEN
        RAISE EXCEPTION 'full_url must be a valid URL starting with http:// or https://';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for UTM parameter validation
CREATE TRIGGER validate_utm_parameters_trigger
    BEFORE INSERT OR UPDATE ON links
    FOR EACH ROW
    EXECUTE FUNCTION validate_utm_parameters();

-- Function to check domain user limit
CREATE OR REPLACE FUNCTION check_domain_user_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count users in the domain
    SELECT COUNT(*) INTO user_count
    FROM teams
    WHERE domain_id = NEW.domain_id;

    -- Check if adding new user would exceed limit
    IF user_count >= 10 THEN
        RAISE EXCEPTION 'Domain user limit (10) exceeded';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for domain user limit
CREATE TRIGGER check_domain_user_limit_trigger
    BEFORE INSERT ON teams
    FOR EACH ROW
    EXECUTE FUNCTION check_domain_user_limit();

-- Function to validate campaign targeting criteria
CREATE OR REPLACE FUNCTION validate_campaign_targeting()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if targeting_criteria is valid JSON
    IF NOT jsonb_typeof(NEW.targeting_criteria) = 'object' THEN
        RAISE EXCEPTION 'targeting_criteria must be a valid JSON object';
    END IF;

    -- Check required targeting fields
    IF NOT NEW.targeting_criteria ? 'audience' THEN
        RAISE EXCEPTION 'targeting_criteria must include audience field';
    END IF;

    IF NOT NEW.targeting_criteria ? 'interests' THEN
        RAISE EXCEPTION 'targeting_criteria must include interests field';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for campaign targeting validation
CREATE TRIGGER validate_campaign_targeting_trigger
    BEFORE INSERT OR UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION validate_campaign_targeting();

-- Function to handle domain subscription status
CREATE OR REPLACE FUNCTION handle_domain_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- If subscription status changes to inactive, update all related campaigns
    IF NEW.subscription_status = 'inactive' AND OLD.subscription_status != 'inactive' THEN
        UPDATE campaigns
        SET status = 'paused'
        WHERE domain_id = NEW.id AND status = 'active';
    END IF;

    -- If subscription status changes to active, allow campaigns to be reactivated
    IF NEW.subscription_status = 'active' AND OLD.subscription_status != 'active' THEN
        UPDATE campaigns
        SET status = 'active'
        WHERE domain_id = NEW.id AND status = 'paused';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for domain subscription status changes
CREATE TRIGGER handle_domain_subscription_trigger
    AFTER UPDATE OF subscription_status ON domains
    FOR EACH ROW
    EXECUTE FUNCTION handle_domain_subscription(); 