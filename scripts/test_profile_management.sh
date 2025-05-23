#!/bin/bash

# Test profile management endpoints
echo "Testing profile management..."

# First login to get session token
echo "Logging in to get session token..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq -r '.session.access_token')

echo "Session token: $TOKEN"

# Test get profile
echo -e "\n\nTesting get profile..."
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN"

# Test update profile
echo -e "\n\nTesting update profile..."
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "updated@example.com"
  }'

# Test invalid update
echo -e "\n\nTesting invalid profile update..."
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email"
  }'

# Test unauthorized access
echo -e "\n\nTesting unauthorized access..."
curl -X GET http://localhost:3000/api/users/profile 