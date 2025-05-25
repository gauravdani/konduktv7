#!/bin/bash

# Test user registration endpoint
echo "Testing user registration..."

# Test valid registration
echo "Testing valid registration..."
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "role": "team_member"
  }'

echo -e "\n\nTesting invalid email..."
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123",
    "role": "team_member"
  }'

echo -e "\n\nTesting invalid password..."
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "short",
    "role": "team_member"
  }'

echo -e "\n\nTesting invalid role..."
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test3@example.com",
    "password": "password123",
    "role": "invalid_role"
  }' 