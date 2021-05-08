# Cognito Trigger Lambda functions

## SAML 2.0 IdP を使用したサインイン

### 新規

1. Pre Sign Up
2. Post Confirmation
3. Pre Token Generation

### ２回目以降

1. Pre Authentication
2. Post Authentication
3. Pre Token Generation

## Cognito 直でのサインイン

2 以降は InitiateAuth が走るときに実行されるのかも？ 

1. Pre Sign Up
2. Pre Authentication
3. Post Authentication
4. Pre Token Generation

### ２回目以降

1. Pre Authentication
2. Post Authentication
3. Pre Token Generation
