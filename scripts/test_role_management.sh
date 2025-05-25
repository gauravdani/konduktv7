#!/bin/bash

# Test role management endpoints
echo "Testing role management..."

# First login as manager to get session token
echo "Logging in as manager..."
MANAGER_TOKEN=$(curl -s -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@example.com",
    "password": "password123"
  }' | jq -r '.session.access_token')

echo "Manager session token: $MANAGER_TOKEN"

# Test get roles
echo -e "\n\nTesting get roles..."
curl -X GET http://localhost:3000/api/users/roles \
  -H "Authorization: Bearer $MANAGER_TOKEN"

# Test update role
echo -e "\n\nTesting update role..."
curl -X PUT http://localhost:3000/api/users/roles \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "role": "manager"
  }'

# Test invalid role update
echo -e "\n\nTesting invalid role update..."
curl -X PUT http://localhost:3000/api/users/roles \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "role": "invalid_role"
  }'

# Login as team member
echo -e "\n\nLogging in as team member..."
TEAM_MEMBER_TOKEN=$(curl -s -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "member@example.com",
    "password": "password123"
  }' | jq -r '.session.access_token')

# Test unauthorized role access
echo -e "\n\nTesting unauthorized role access..."
curl -X GET http://localhost:3000/api/users/roles \
  -H "Authorization: Bearer $TEAM_MEMBER_TOKEN"

# Test unauthorized role update
echo -e "\n\nTesting unauthorized role update..."
curl -X PUT http://localhost:3000/api/users/roles \
  -H "Authorization: Bearer $TEAM_MEMBER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "role": "manager"
  }' 