#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test credentials
TEST_EMAIL="gaurav.dani@joyn.de"
TEST_PASSWORD="Test@123456"

echo "Testing Authentication Flow..."
echo "=============================="

# Test 1: Sign Up
echo -e "\n${GREEN}Test 1: Sign Up${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

SIGNUP_STATUS=$(echo $SIGNUP_RESPONSE | jq -r '.message // .error')
if [[ $SIGNUP_STATUS == "User created successfully" ]]; then
  echo "✅ Sign Up successful"
else
  echo "❌ Sign Up failed: $SIGNUP_STATUS"
  echo "Response: $SIGNUP_RESPONSE"
fi

# Test 2: Sign In
echo -e "\n${GREEN}Test 2: Sign In${NC}"
SIGNIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

SIGNIN_STATUS=$(echo $SIGNIN_RESPONSE | jq -r '.message // .error')
if [[ $SIGNIN_STATUS == "Sign in successful" ]]; then
  echo "✅ Sign In successful"
  # Extract and save the session token
  SESSION_TOKEN=$(echo $SIGNIN_RESPONSE | jq -r '.session.access_token')
  echo "Session token obtained"
else
  echo "❌ Sign In failed: $SIGNIN_STATUS"
  echo "Response: $SIGNIN_RESPONSE"
fi

# Test 3: Sign In with Invalid Password
echo -e "\n${GREEN}Test 3: Sign In with Invalid Password${NC}"
INVALID_SIGNIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"wrongpassword\"}")

INVALID_SIGNIN_STATUS=$(echo $INVALID_SIGNIN_RESPONSE | jq -r '.error')
if [[ $INVALID_SIGNIN_STATUS == "Authentication failed" ]]; then
  echo "✅ Invalid password test passed"
else
  echo "❌ Invalid password test failed: $INVALID_SIGNIN_STATUS"
  echo "Response: $INVALID_SIGNIN_RESPONSE"
fi

# Test 4: Sign In with Invalid Email Format
echo -e "\n${GREEN}Test 4: Sign In with Invalid Email Format${NC}"
INVALID_EMAIL_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"invalid-email\",\"password\":\"$TEST_PASSWORD\"}")

INVALID_EMAIL_STATUS=$(echo $INVALID_EMAIL_RESPONSE | jq -r '.error')
if [[ $INVALID_EMAIL_STATUS == "Invalid email format" ]]; then
  echo "✅ Invalid email format test passed"
else
  echo "❌ Invalid email format test failed: $INVALID_EMAIL_STATUS"
  echo "Response: $INVALID_EMAIL_RESPONSE"
fi

# Test 5: Sign In with Missing Credentials
echo -e "\n${GREEN}Test 5: Sign In with Missing Credentials${NC}"
MISSING_CREDS_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d "{}")

MISSING_CREDS_STATUS=$(echo $MISSING_CREDS_RESPONSE | jq -r '.error')
if [[ $MISSING_CREDS_STATUS == "Email and password are required" ]]; then
  echo "✅ Missing credentials test passed"
else
  echo "❌ Missing credentials test failed: $MISSING_CREDS_STATUS"
  echo "Response: $MISSING_CREDS_RESPONSE"
fi

echo -e "\nAuthentication Flow Testing Complete"
echo "=====================================" 