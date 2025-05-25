# Database and Backend

## Overview
Implementation of database schema, backend services, and data management features.

# Database and Backend

## Overview
Implementation of database schema, backend services, and data management features.

##Rules
1. A manager should be able to create a domain.
2. First user for a new domain can be considered a manager
3. A domain is necessary for user sign up. 
4. Only a manager can delete a domain. (except the one that was used to sign up.)
5. A manager can add other users to work on a domain
6. A manager or a user can create multiple campaigns. 
7. A manager or a user can create multiple urls with different utm parameters 

## Complexity: 9/10

## Tasks
- [x] Set up Supabase database
  - [x] Configure database instance
  - [x] Set up security rules
  - [x] Implement backup system
  - [x] Configure monitoring

- [x] Implement database schema
  - [x] Create users table
  - [x] Build domains table
  - [x] Implement teams table
  - [x] Create campaigns table
  - [x] Add links table

- [x] Create database indexes and relationships
  - [x] Implement foreign keys
  - [x] Add performance indexes
  - [x] Create constraints
  - [x] Set up cascading rules

- [x] Implement data validation rules
  - [x] Add input validation
  - [x] Create data integrity checks
  - [x] Implement business rules
  - [x] Add error handling

- [x] Set up database backup system
  - [x] Configure automated backups
  - [x] Implement recovery procedures
  - [x] Add backup verification
  - [x] Create backup monitoring

## Next Steps

### 1. API Implementation
- [ ] Create API endpoints for user management
  - [ ] User registration
  - [ ] User login
  - [ ] User profile management
  - [ ] Role management

- [ ] Implement domain management endpoints
  - [ ] Domain creation
  - [ ] Domain settings
  - [ ] Subscription management
  - [ ] Team member management

- [ ] Develop campaign management APIs
  - [ ] Campaign CRUD operations
  - [ ] Campaign status management
  - [ ] Campaign targeting configuration
  - [ ] Campaign analytics

- [ ] Create link management endpoints
  - [ ] UTM link generation
  - [ ] Link tracking
  - [ ] Link analytics
  - [ ] Bulk operations

### 2. Authentication Integration
- [ ] Set up Clerk authentication
  - [ ] Configure OAuth providers
  - [ ] Implement JWT handling
  - [ ] Set up session management
  - [ ] Configure security policies

### 3. Error Handling and Logging
- [ ] Implement Sentry integration
  - [ ] Set up error tracking
  - [ ] Configure performance monitoring
  - [ ] Set up alerting
  - [ ] Create error reporting

### 4. Testing
- [ ] Create API test suite
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] End-to-end tests
  - [ ] Performance tests

### 5. Documentation
- [ ] Create API documentation
  - [ ] Endpoint specifications
  - [ ] Authentication details
  - [ ] Request/response examples
  - [ ] Error codes

## Database Schema Reference

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'team_member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Domains Table
```sql
CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    manager_id UUID NOT NULL REFERENCES users(id),
    subscription_status VARCHAR(50) NOT NULL CHECK (subscription_status IN ('trial', 'active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Teams Table
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain_id UUID NOT NULL REFERENCES domains(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'team_member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain_id, user_id)
);
```

### Campaigns Table
```sql
CREATE TABLE campaigns (
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
```

### Links Table
```sql
CREATE TABLE links (
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
```

### Key Indexes
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_domains_manager_id ON domains(manager_id);
CREATE INDEX idx_teams_domain_user ON teams(domain_id, user_id);
CREATE INDEX idx_campaigns_domain_id ON campaigns(domain_id);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX idx_links_campaign_id ON links(campaign_id);
CREATE INDEX idx_links_created_by ON links(created_by);
```

## Dependencies
- Supabase account
- Database design tools
- Backup storage solution

## Acceptance Criteria
- [x] Database schema is properly implemented
- [x] Relationships and constraints work correctly
- [x] Data validation is effective
- [x] Backup system is reliable 