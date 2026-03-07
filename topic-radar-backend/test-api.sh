#!/bin/bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYTM5MjIwMC1jMmIxLTQwZmQtYmYwMi1kYmY4OTMwZTQ1YTgiLCJvcGVuaWQiOiJkZXZfb3BlbmlkX3Rlc3QwMDEiLCJtZW1iZXJzaGlwIjoiZnJlZSIsIm1lbWJlcnNoaXBFeHBpcmVzQXQiOm51bGwsImlhdCI6MTc3Mjc4NTIwNSwiZXhwIjoxNzczMzkwMDA1fQ.4r_3TwUTkthMJRE1tkiOGFOE3nk9FcTKiK1Nef7d1BU"
AUTH="Authorization: Bearer $TOKEN"
BASE="http://localhost:3000/api"
PASS=0
FAIL=0

test_api() {
  local label="$1"
  local method="$2"
  local path="$3"
  local data="$4"
  local need_auth="$5"

  local headers=""
  if [ "$need_auth" = "auth" ]; then
    headers="-H \"$AUTH\""
  fi

  local cmd="curl -s -X $method $BASE$path"
  if [ "$need_auth" = "auth" ]; then
    cmd="$cmd -H \"$AUTH\""
  fi
  if [ -n "$data" ]; then
    cmd="$cmd -H 'Content-Type: application/json' -d '$data'"
  fi

  local result=$(eval $cmd)
  local code=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)

  if [ "$code" = "200" ]; then
    echo "PASS: $label (code=$code)"
    PASS=$((PASS+1))
  else
    echo "FAIL: $label (code=$code)"
    echo "  Response: $(echo $result | head -c 200)"
    FAIL=$((FAIL+1))
  fi
}

echo "========================================="
echo "   API Test Suite - Topic Radar Backend"
echo "========================================="

# Auth Module
echo ""
echo "--- Auth Module ---"
test_api "POST /auth/wechat-login (re-login)" "POST" "/auth/wechat-login" '{"code":"dev_test001"}' ""
test_api "POST /auth/refresh" "POST" "/auth/refresh" "" "auth"

# Users Module
echo ""
echo "--- Users Module ---"
test_api "GET /users/profile" "GET" "/users/profile" "" "auth"
test_api "PATCH /users/profile" "PATCH" "/users/profile" '{"nickname":"TestUser"}' "auth"
test_api "GET /users/config" "GET" "/users/config" "" "auth"
test_api "PATCH /users/config" "PATCH" "/users/config" '{"likeThreshold":50000}' "auth"
test_api "GET /users/balance" "GET" "/users/balance" "" "auth"
test_api "GET /users/stats" "GET" "/users/stats" "" "auth"

# Topics Module
echo ""
echo "--- Topics Module ---"
test_api "GET /topics/categories (public)" "GET" "/topics/categories" "" ""
test_api "GET /topics/daily" "GET" "/topics/daily" "" "auth"
test_api "GET /topics/daily/stats" "GET" "/topics/daily/stats" "" "auth"

# Videos Module
echo ""
echo "--- Videos Module ---"
test_api "GET /videos/by-topic/:id (empty)" "GET" "/videos/by-topic/00000000-0000-0000-0000-000000000000" "" "auth"

# Analysis Module
echo ""
echo "--- Analysis Module ---"
test_api "GET /analysis/my-unlocks" "GET" "/analysis/my-unlocks" "" "auth"

# Generation Module
echo ""
echo "--- Generation Module ---"
test_api "GET /generation/my-works" "GET" "/generation/my-works" "" "auth"

# Billing Module
echo ""
echo "--- Billing Module ---"
test_api "GET /billing/pricing (public)" "GET" "/billing/pricing" "" ""
test_api "GET /billing/transactions" "GET" "/billing/transactions" "" "auth"
test_api "POST /billing/recharge" "POST" "/billing/recharge" '{"amount":100}' "auth"

# Storage Module
echo ""
echo "--- Storage Module ---"
test_api "GET /storage/presigned-url" "GET" "/storage/presigned-url?filename=test.jpg" "" "auth"

# Auth checks
echo ""
echo "--- Security Tests ---"
UNAUTH=$(curl -s http://localhost:3000/api/users/profile)
UNAUTH_CODE=$(echo "$UNAUTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
if [ "$UNAUTH_CODE" = "401" ]; then
  echo "PASS: Protected endpoint returns 401 without token"
  PASS=$((PASS+1))
else
  echo "FAIL: Protected endpoint should return 401"
  FAIL=$((FAIL+1))
fi

echo ""
echo "========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================="
