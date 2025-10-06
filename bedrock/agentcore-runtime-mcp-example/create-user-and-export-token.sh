#!/bin/sh

TEST_USER=testuser

if ! aws cognito-idp admin-get-user --user-pool-id "$POOL_ID" --username "$TEST_USER" --region "$AWS_REGION" > /dev/null; then
  if ! aws cognito-idp admin-create-user \
    --user-pool-id "$POOL_ID" \
    --username "$TEST_USER" \
    --temporary-password "TestPassword123!" \
    --region "$AWS_REGION" \
    --message-action SUPPRESS > /dev/null 2>&1; then
    echo "Failed to create user $TEST_USER"
    exit 1;
  fi
fi

TEST_USER_PASSWORD="test1234ABC!"

# Set Permanent Password
if ! aws cognito-idp admin-set-user-password \
      --user-pool-id "$POOL_ID" \
      --username "$TEST_USER" \
      --password "$TEST_USER_PASSWORD" \
      --region "$AWS_REGION" \
      --permanent > /dev/null 2>&1; then
  echo "Failed to set permanent password for user $TEST_USER"
  exit 1;
fi


RESPONSE=$(aws cognito-idp initiate-auth \
  --client-id "$CLIENT_ID" \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME="$TEST_USER",PASSWORD="$TEST_USER_PASSWORD" \
  --region "$AWS_REGION")

# jq -r '.' << EOF
# $RESPONSE
# EOF

REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.AuthenticationResult.RefreshToken'); export REFRESH_TOKEN

# アクセストークンが expire している可能性があるため Reflesh token から再取得
BEARER_TOKEN=$(aws cognito-idp get-tokens-from-refresh-token \
  --refresh-token "$REFRESH_TOKEN" \
  --client-id "$CLIENT_ID"  \
  --region "$AWS_REGION" | jq -r '.AuthenticationResult.AccessToken'); export BEARER_TOKEN
echo "Bearer $BEARER_TOKEN"
# echo Reflesh token: "$REFRESH_TOKEN"
