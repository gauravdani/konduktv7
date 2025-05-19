#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Source environment variables from .env.local
if [ -f .env.local ]; then
    source .env.local
else
    echo "Error: .env.local file not found"
    exit 1
fi

# Check for required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Error: Required environment variables are not set in .env.local"
    echo "Please ensure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are set"
    exit 1
fi

# Base URL - change this to match your environment
BASE_URL="http://localhost:3000/api"

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        echo "Response Status: $3"
        echo "Response Body: $4"
        if [ ! -z "$5" ]; then
            echo "Error Details: $5"
        fi
    fi
}

# Function to print section headers
print_section() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
}

# Function to print response details
print_response() {
    echo -e "\nResponse Status: $1"
    echo "Response Body: $2"
    if [ ! -z "$3" ]; then
        echo "Error Details: $3"
    fi
}

# Function to make API request and handle response
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4

    # Build the curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X '$method' '${BASE_URL}${endpoint}' -H 'Content-Type: application/json'"
    
    # Add headers if provided
    if [ ! -z "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    # Add Authorization header if we have a session token
    if [ ! -z "$SESSION_TOKEN" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $SESSION_TOKEN'"
    fi
    
    # Add data if provided and method is not DELETE
    if [ ! -z "$data" ] && [ "$method" != "DELETE" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi

    # Add cookie handling
    curl_cmd="$curl_cmd -b cookies.txt -c cookies.txt"

    # Execute the curl command and capture output
    local response=$(eval "$curl_cmd")
    
    # Extract status code and body
    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    # Check if response is HTML
    if [[ "$body" == *"<!DOCTYPE html>"* ]]; then
        echo "HTML response received. Status: $status_code"
        echo "Response body: $body"
        return 1
    fi

    # Try to parse JSON response
    if ! echo "$body" | jq . >/dev/null 2>&1; then
        echo "Invalid JSON response. Status: $status_code"
        echo "Response body: $body"
        return 1
    fi

    echo "$status_code"
    echo "$body"
    return 0
}

# Function to cleanup test data
cleanup() {
    print_section "Cleaning up test data"
    if [ ! -z "$SESSION_TOKEN" ]; then
        # Delete test domain if it exists
        if [ ! -z "$DOMAIN_ID" ]; then
            response=$(make_request "DELETE" "/domains/${DOMAIN_ID}" "" "-H 'Authorization: Bearer $SESSION_TOKEN'")
            status_code=$(echo "$response" | head -n1)
            body=$(echo "$response" | tail -n+2)
            
            if [ "$status_code" = "200" ]; then
                print_result 0 "Test domain deleted"
            else
                print_result 1 "Failed to delete test domain" "$status_code" "$body"
            fi
        fi

        # Delete test user
        response=$(make_request "DELETE" "/users" "" "-H 'Authorization: Bearer $SESSION_TOKEN'")
        status_code=$(echo "$response" | head -n1)
        body=$(echo "$response" | tail -n+2)
        
        if [ "$status_code" = "200" ]; then
            print_result 0 "Test user deleted"
        else
            print_result 1 "Failed to delete test user" "$status_code" "$body"
        fi
    fi
}

# Set up cleanup on script exit
trap cleanup EXIT

echo "Testing API Endpoints..."
echo "======================="

# Test 0: Sign in and get session
print_section "Testing Authentication"

# Clean up any existing test user
print_section "Cleaning up existing test user"
response=$(make_request "DELETE" "/auth/cleanup" "" "-H 'Content-Type: application/json' -d '{\"email\": \"test.user@konduktv.com\"}'")
status_code=$(echo "$response" | head -n1)
body=$(echo "$response" | tail -n+2)

if [ "$status_code" = "200" ]; then
    print_result 0 "Successfully cleaned up existing test user"
else
    print_result 1 "Failed to clean up existing test user" "$status_code" "$body"
fi

# Use a more realistic test email with a valid domain
TEST_EMAIL="test.user@konduktv.com"
# Use a strong password that meets all requirements
TEST_PASSWORD="Test@123456"

# First, try to sign up
print_section "Signing up test user"
response=$(make_request "POST" "/auth/signup" "{\"email\": \"${TEST_EMAIL}\", \"password\": \"${TEST_PASSWORD}\"}")
status_code=$(echo "$response" | head -n1)
body=$(echo "$response" | tail -n+2)

if [ "$status_code" = "201" ]; then
    print_result 0 "Successfully signed up user"
else
    error=$(echo "$body" | jq -r '.error // ""')
    details=$(echo "$body" | jq -r '.details // ""')
    print_result 1 "Failed to sign up user" "$status_code" "$body" "$error: $details"
fi

# Clean up cookies file at start
rm -f cookies.txt

# Then sign in
print_section "Signing in test user"
response=$(make_request "POST" "/auth/signin" "{\"email\": \"${TEST_EMAIL}\", \"password\": \"${TEST_PASSWORD}\"}")
status_code=$(echo "$response" | head -n1)
body=$(echo "$response" | tail -n+2)

if [ "$status_code" = "200" ]; then
    # Extract session token
    SESSION_TOKEN=$(echo "$body" | jq -r '.session.access_token')
    
    if [ -z "$SESSION_TOKEN" ] || [ "$SESSION_TOKEN" = "null" ]; then
        print_result 1 "Failed to get session token"
        print_response "$status_code" "$body"
        exit 1
    fi
    
    print_result 0 "Successfully signed in user"
    echo "Session token obtained"
else
    error=$(echo "$body" | jq -r '.error // ""')
    details=$(echo "$body" | jq -r '.details // ""')
    print_result 1 "Failed to sign in user" "$status_code" "$body" "$error: $details"
    exit 1
fi

# Test 1: Get user profile
print_section "Testing User Profile Retrieval"
response=$(make_request "GET" "/users" "" "-H 'Authorization: Bearer $SESSION_TOKEN'")
status_code=$(echo "$response" | head -n1)
body=$(echo "$response" | tail -n+2)

if [ "$status_code" = "200" ]; then
    USER_ID=$(echo "$body" | jq -r '.id')
    print_result 0 "Successfully fetched user profile"
    echo "User ID: $USER_ID"
else
    error=$(echo "$body" | jq -r '.error // ""')
    details=$(echo "$body" | jq -r '.details // ""')
    print_result 1 "Failed to fetch user profile" "$status_code" "$body" "$error: $details"
fi

# Test 2: Create a new domain
print_section "Testing Domain Creation"
response=$(make_request "POST" "/domains" "{\"domain_name\": \"test.konduktv.com\"}" "-H 'Authorization: Bearer $SESSION_TOKEN'")
status_code=$(echo "$response" | head -n1)
body=$(echo "$response" | tail -n+2)

if [ "$status_code" = "201" ]; then
    DOMAIN_ID=$(echo "$body" | jq -r '.id')
    print_result 0 "Successfully created domain"
    echo "Domain ID: $DOMAIN_ID"
else
    error=$(echo "$body" | jq -r '.error // ""')
    details=$(echo "$body" | jq -r '.details // ""')
    print_result 1 "Failed to create domain" "$status_code" "$body" "$error: $details"
fi

# Test 3: Get domains
print_section "Testing Domain Listing"
response=$(make_request "GET" "/domains" "" "-H 'Authorization: Bearer $SESSION_TOKEN'")
status_code=$(echo "$response" | head -n1)
body=$(echo "$response" | tail -n+2)

if [ "$status_code" = "200" ]; then
    print_result 0 "Successfully listed domains"
    echo "Domains: $body"
else
    error=$(echo "$body" | jq -r '.error // ""')
    details=$(echo "$body" | jq -r '.details // ""')
    print_result 1 "Failed to list domains" "$status_code" "$body" "$error: $details"
fi

# Test 4: Update domain
if [ ! -z "$DOMAIN_ID" ]; then
    print_section "Testing Domain Update"
    response=$(make_request "PATCH" "/domains/${DOMAIN_ID}" "{\"subscription_status\": \"active\"}" "-H 'Authorization: Bearer $SESSION_TOKEN'")
    status_code=$(echo "$response" | head -n1)
    body=$(echo "$response" | tail -n+2)

    if [ "$status_code" = "200" ]; then
        print_result 0 "Domain updated successfully"
        echo "Updated Domain: $body"
    else
        error=$(echo "$body" | jq -r '.error // ""')
        details=$(echo "$body" | jq -r '.details // ""')
        print_result 1 "Failed to update domain" "$status_code" "$body" "$error: $details"
    fi
fi

# Test 5: Update user profile
print_section "Testing User Profile Update"
response=$(make_request "PATCH" "/users" "{\"role\": \"manager\"}" "-H 'Authorization: Bearer $SESSION_TOKEN'")
status_code=$(echo "$response" | head -n1)
body=$(echo "$response" | tail -n+2)

if [ "$status_code" = "200" ]; then
    print_result 0 "User profile updated successfully"
    echo "Updated Profile: $body"
else
    error=$(echo "$body" | jq -r '.error // ""')
    details=$(echo "$body" | jq -r '.details // ""')
    print_result 1 "Failed to update user profile" "$status_code" "$body" "$error: $details"
fi

echo -e "\nAPI Testing Complete!" 