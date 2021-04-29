# S3 access Lambda function with Cognito Authentication

## deploy command
```
cdk deploy -c env={dev or prod}
```

### example

```
cdk deploy -c env=dev
```

### Auth0 を使う場合

cdk.context.json へ、Auth0 テナントのドメイン名のプレフィックスをリージョン(国名)付きで指定する。

```$json
{
  "dev": {
    "region": "us-west-2",
    "domain": "your-cognito-user-pool-domain",
    "auth0Domain": "your-tenant-domain.jp",
    "groups": [ 
      {
        "id": "Sub1",
        "name": "sub1",
        "admin": true
      },
      {
        "id": "Sub2",
        "name": "sub2",
        "admin": false
      }
    ]
  }
}

```
