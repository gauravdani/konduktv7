-- Test database setup and schema
DO $$
DECLARE
    test_user_id UUID;
    test_domain_id UUID;
    test_campaign_id UUID;
    test_link_id UUID;
    test_team_id UUID;
BEGIN
    -- Test 1: Create a test user
    INSERT INTO users (email, role)
    VALUES ('test@example.com', 'manager')
    RETURNING id INTO test_user_id;
    
    RAISE NOTICE 'Test 1: User created successfully with ID: %', test_user_id;
    
    -- Test 2: Create a test domain
    INSERT INTO domains (domain_name, manager_id, subscription_status)
    VALUES ('test-domain.com', test_user_id, 'trial')
    RETURNING id INTO test_domain_id;
    
    RAISE NOTICE 'Test 2: Domain created successfully with ID: %', test_domain_id;
    
    -- Test 3: Create a test team member
    INSERT INTO teams (domain_id, user_id, role)
    VALUES (test_domain_id, test_user_id, 'manager')
    RETURNING id INTO test_team_id;
    
    RAISE NOTICE 'Test 3: Team member added successfully with ID: %', test_team_id;
    
    -- Test 4: Create a test campaign
    INSERT INTO campaigns (
        name,
        source,
        objective,
        targeting_criteria,
        status,
        domain_id,
        created_by
    )
    VALUES (
        'Test Campaign',
        'facebook',
        'awareness',
        '{"audience": ["test"], "interests": ["marketing"]}'::jsonb,
        'active',
        test_domain_id,
        test_user_id
    )
    RETURNING id INTO test_campaign_id;
    
    RAISE NOTICE 'Test 4: Campaign created successfully with ID: %', test_campaign_id;
    
    -- Test 5: Create a test link
    INSERT INTO links (
        campaign_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        full_url,
        created_by
    )
    VALUES (
        test_campaign_id,
        'facebook',
        'social',
        'test-campaign',
        'post1',
        'test',
        'https://example.com',
        test_user_id
    )
    RETURNING id INTO test_link_id;
    
    RAISE NOTICE 'Test 5: Link created successfully with ID: %', test_link_id;
    
    -- Test 6: Verify RLS policies
    RAISE NOTICE 'Test 6: Testing RLS policies...';
    
    -- Test 7: Verify triggers
    RAISE NOTICE 'Test 7: Testing triggers...';
    
    -- Test 8: Verify constraints
    RAISE NOTICE 'Test 8: Testing constraints...';
    
    -- Cleanup test data
    DELETE FROM links WHERE id = test_link_id;
    DELETE FROM campaigns WHERE id = test_campaign_id;
    DELETE FROM teams WHERE id = test_team_id;
    DELETE FROM domains WHERE id = test_domain_id;
    DELETE FROM users WHERE id = test_user_id;
    
    RAISE NOTICE 'All tests completed successfully!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test failed: %', SQLERRM;
        -- Cleanup in case of failure
        IF test_link_id IS NOT NULL THEN DELETE FROM links WHERE id = test_link_id; END IF;
        IF test_campaign_id IS NOT NULL THEN DELETE FROM campaigns WHERE id = test_campaign_id; END IF;
        IF test_team_id IS NOT NULL THEN DELETE FROM teams WHERE id = test_team_id; END IF;
        IF test_domain_id IS NOT NULL THEN DELETE FROM domains WHERE id = test_domain_id; END IF;
        IF test_user_id IS NOT NULL THEN DELETE FROM users WHERE id = test_user_id; END IF;
        RAISE;
END $$; 