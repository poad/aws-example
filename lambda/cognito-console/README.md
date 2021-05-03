# AWS Management Console Sign In Lambda Function with Cognito Authentication

## deploy command
```
cdk deploy -c env={dev or prod}
```

### example

```
cdk deploy -c env=dev
```

## 拡張機能

### SAML IdP 連携

1. cdk.context.json を作成する
2. `cdk deploy` する。
3. AWS 管理コンソールへサインイし、Cognito ユーザープールへ SAML IdP の設定を行う。

#### Auth0 を使う場合
[How do I set up Auth0 as a SAML identity provider with an Amazon Cognito user pool?](https://aws.amazon.com/premiumsupport/knowledge-center/auth0-saml-cognito-user-pool/?nc1=h_ls) に従って設定する。

- mappings 設定は記述不要

##### Auth0 設定
[Deploy CLI Tool](https://auth0.com/docs/deploy/deploy-cli-tool/create-and-configure-the-deploy-cli-application) を使用して設置する。

auth0/config.json に設定を反映する。

```$sh
a0deploy import --config_file auth0/config.json --input_file auth0/tenant.yaml
```

### Auth0 を使う場合

1. cdk.context.json を作成し、 `auth0Domain` を追加し、Auth0 テナントのドメイン名のプレフィックスをリージョン(国名)付きで指定する。

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

2. `cdk deploy` する。
3. Cognito ユーザープールにテストユーザーを追加する。
4. Auth0 テナントの Authnetication > Social で、「CREATE CONNECTION」 をクリック
5. 「Create Custom」をクリック
6. 以下を入力

| Authorization URL | https://`your-cognito-user-pool-domain`.auth.`your-cognito-user-pool-region`.amazoncognito.com/oauth2/authorize |
| Token URL | https://`your-cognito-user-pool-domain`.auth.`your-cognito-user-pool-region`.amazoncognito.com/oauth2/token |
| Scope | `openid email profile` |
| Client ID | Cognito ユーザープールの OAuth 2.0 アプリのクライアント ID |
| Client Secret | Cognito ユーザープールの OAuth 2.0 アプリのクライアント シークレット (未生成なら入力せずとも良い) |
| Fetch User Profile Script | ```$javascript
function(accessToken, ctx, cb) {
  request.get('https://`your-cognito-user-pool-domain`.auth.`your-cognito-user-pool-region`.amazoncognito.com/oauth2/userInfo', {
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  }, function(e, r, b) {
    if (e) return cb(e);
    if (r.statusCode !== 200) return cb(new Error('StatusCode: ' + r.statusCode));
    var profile = JSON.parse(b);
    cb(null, {
      user_id: profile.sub,
      email: profile.email,
    });
  });
}
```
|
| Custom Headers | (入力しない) |

7. 「CREATE」をクリック
8. 「TRY CONNECTION」で Cognbito ユーザープールのユーザー認証が実行され、ユーザー情報が取得出来ることを確認する

### OAuth 2.0 Device Flow

Auth0 only

[クラスメソッドの記事](https://dev.classmethod.jp/articles/amazon-api-gateway-http-api-authz-auth0/) を参考に設定する。

API Gateway の API を呼び出せるのみ。（その先は現時点では何も出来ない)
