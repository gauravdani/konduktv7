# API Testing Scripts

This directory contains scripts for testing the API endpoints of the application.

## Prerequisites

Before running the tests, ensure you have:

1. The application running locally (default: http://localhost:3000)
2. `curl` installed on your system
3. `jq` installed for JSON parsing (you can install it with `brew install jq` on macOS)

## Available Scripts

### test-api.sh

This script tests all the main API endpoints:

1. User Creation (POST /api/users)
2. User Profile Retrieval (GET /api/users)
3. Domain Creation (POST /api/domains)
4. Domain Listing (GET /api/domains)
5. Domain Update (PATCH /api/domains/:id)
6. User Profile Update (PATCH /api/users)

## How to Run

1. Make sure your application is running:
   ```bash
   npm run dev
   ```

2. Run the test script:
   ```bash
   ./scripts/test-api.sh
   ```

## Expected Output

The script will show:
- ✓ Green checkmarks for successful tests
- ✗ Red X marks for failed tests
- Detailed response data for each test
- HTTP status codes and response bodies

## Troubleshooting

If you encounter issues:

1. Check that your application is running on the correct port (default: 3000)
2. Verify that you have the required dependencies installed
3. Check the application logs for any backend errors
4. Ensure you have the correct environment variables set up

## Customizing Tests

You can modify the test script to:
- Change the base URL (modify `BASE_URL` variable)
- Add new test cases
- Modify test data
- Add authentication headers if required 