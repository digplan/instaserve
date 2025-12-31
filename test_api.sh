#!/bin/bash

# Configuration
PORT=3001
BASE_URL="https://127.0.0.1:$PORT"
DB_FILE="data.db"
TEST_USER="testuser"
TEST_TOKEN="test_token_12345"
TEST_KEY="test_key"
TEST_VALUE="test_value"
SERVER_PID=""

# Helper function to run sqlite commands
run_sqlite() {
  sqlite3 "$DB_FILE" "$1"
}

# Cleanup function to kill server and remove test data
cleanup() {
  echo ""
  echo "--- Cleanup ---"
  
  if [ -n "$SERVER_PID" ]; then
    echo "Stopping server (PID: $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null
  fi

  echo "Removing test data..."
  run_sqlite "DELETE FROM users WHERE id = 'test_id';"
  # run_sqlite "DELETE FROM kv WHERE key = '$TEST_USER:$TEST_KEY';"
  
  rm -f server.log
  echo "Done."
}

# Register cleanup to run on script exit (success or failure)
trap cleanup EXIT

# 1. Start the Server
echo "--- Setup ---"
echo "Starting Instaserve on port $PORT..."
# Start server in background, directing output to log
./instaserve -api ./routes-full.js -secure -port "$PORT" > server.log 2>&1 &
SERVER_PID=$!
echo "Server process ID: $SERVER_PID"

# Wait for server to be ready
echo "Waiting for server to start..."
MAX_RETRIES=10
COUNT=0
STARTED=false

while [ $COUNT -lt $MAX_RETRIES ]; do
  if grep -q "started on:" server.log; then
    STARTED=true
    break
  fi
  sleep 1
  ((COUNT++))
  echo -n "."
done
echo ""

if [ "$STARTED" = false ]; then
  echo "FAIL: Server failed to start within timeout."
  echo "Server Log:"
  cat server.log
  exit 1
fi

echo "Server is running!"

# 2. Insert Test User
echo "Setting up test user in database..."
# Ensure tables exist (the server creation might race with this if it's the very first run, 
# but server is confirmed started above, so tables should be there)
run_sqlite "INSERT OR REPLACE INTO users (id, username, token, name, email) VALUES ('test_id', '$TEST_USER', '$TEST_TOKEN', 'Test User', 'test@example.com');"


# 3. Validation Tests
echo ""
echo "--- Running Tests ---"

# Test 1: Unauthenticated Access
echo "- Testing unauthenticated access to /api (Expect 401)..."
HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$BASE_URL/api")
if [ "$HTTP_CODE" == "401" ]; then
  echo "  ✅ PASS"
else
  echo "  ❌ FAIL: Returned $HTTP_CODE"
fi

# Test 2: POST /api (Set Key)
echo "- Testing POST /api (Set Key)..."
RESPONSE=$(curl -k -s -X POST "$BASE_URL/api" \
  -H "Cookie: token=$TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"key\": \"$TEST_KEY\", \"value\": \"$TEST_VALUE\"}")

if [[ "$RESPONSE" == *"$TEST_VALUE"* ]]; then
  echo "  ✅ PASS: $RESPONSE"
else
  echo "  ❌ FAIL: $RESPONSE"
fi

# Test 3: GET /api (Get Value)
echo "- Testing GET /api (Get Key)..."
RESPONSE=$(curl -k -s -G "$BASE_URL/api" \
  -H "Cookie: token=$TEST_TOKEN" \
  --data-urlencode "key=$TEST_KEY")

if [[ "$RESPONSE" == *"$TEST_VALUE"* ]]; then
  echo "  ✅ PASS: $RESPONSE"
else
  echo "  ❌ FAIL: $RESPONSE"
fi

# Test 4: GET /all (List Keys)
echo "- Testing GET /all..."
RESPONSE=$(curl -k -s "$BASE_URL/all" \
  -H "Cookie: token=$TEST_TOKEN")

if [[ "$RESPONSE" == *"$TEST_KEY"* ]]; then
  echo "  ✅ PASS: Found key in list"
else
  echo "  ❌ FAIL: $RESPONSE"
fi

# 6. Test Authenticated Access (DELETE /api) - Delete Key
echo "- Testing DELETE /api..."
RESPONSE=$(curl -k -s -X DELETE "$BASE_URL/api" \
  -H "Cookie: token=$TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"key\": \"$TEST_KEY\"}")

if [[ "$RESPONSE" == *"deleted"* ]]; then
  echo "  ✅ PASS: $RESPONSE"
else
  echo "  ❌ FAIL: $RESPONSE"
fi

# 7. Test Login Redirect
echo "- Testing GET /login (Expect 302 Redirect to Auth0)..."
LOGIN_HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$BASE_URL/login")
if [ "$LOGIN_HTTP_CODE" == "302" ]; then
  echo "  ✅ PASS"
else
  echo "  ❌ FAIL: Returned $LOGIN_HTTP_CODE"
fi

# 8. Test Logout
echo "- Testing GET /logout (Expect 302 Redirect)..."
# Use -D - to dump headers, -o /dev/null to discard body
LOGOUT_HEADERS=$(curl -k -s -D - -o /dev/null "$BASE_URL/logout" -H "Cookie: token=$TEST_TOKEN")

if echo "$LOGOUT_HEADERS" | grep -q "302 Found"; then
  echo "  ✅ PASS: Redirect confirmed"
else
  echo "  ❌ FAIL: No redirect found in headers"
  echo "$LOGOUT_HEADERS"
fi

echo "- Verifying token invalidation (Expect 401 on /api)..."
# Reuse TEST_TOKEN which should now be invalidated in DB
HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "$BASE_URL/api" -H "Cookie: token=$TEST_TOKEN")
if [ "$HTTP_CODE" == "401" ]; then
  echo "  ✅ PASS: Token no longer accepted"
else
  echo "  ❌ FAIL: Token still valid (Returned $HTTP_CODE)"
fi
