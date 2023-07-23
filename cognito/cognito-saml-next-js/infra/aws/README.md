# Cognito SAML IdP CDK Stack

## deploy

1. `yarn global add aws-cdk` および `yarn install` を実行する
2. cdk.json 内の domain を未取得のものに書き換える
3. ユーザープールを作成
4. SAML2.0 SSO アプリを Azure Active Directory に追加する
5. 「SAML 署名証明書」の「アプリのフェデレーション メタデータ URL」をコピーする
6. 「アプリのフェデレーション メタデータ URL」を metaURL に指定して cdk deploy し直す

### ユーザープールを作成

```sh
cdk deploy -c env=dev
```

ユーザープール ID とアプリケーションクライアント ID を控えておく

### SAML2.0 SSO アプリを Azure Active Directory に追加する

#### 基本的な SAML 構成

| 項目 | 設定値 |
|:---|:---|
| 識別子 (エンティティ ID) | `urn:amazon:cognito:sp:${user-pool-id}` |
| 応答 URL (Assertion Consumer Service URL) | `https://${domain}.auth.${region}.amazoncognito.com/saml2/idpresponse` |
| サインオン URL | `https://${domain}.auth.${region}.amazoncognito.com/login?response_type=token&client_id=${clientAppId}&redirect_uri=${loginRedirectUrl}&scope=email+openid+profile+aws.cognito.signin.user.admin` |
| ログアウト URL | `https://${domain}.auth.${region}.amazoncognito.com/logout?client_id=${clientAppId}&scope=openid+profile+aws.cognito.signin.user.admin&redirect_uri=${loginRedirectUrl}` |

#### 属性とクレーム

##### 必要な要求

| クレーム名 | 値 |
|:---|:---|
| 一意のユーザー識別子 (名前 ID) | user.email |

##### 追加の要求

| クレーム名 | 値 |
|:---|:---|
| `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` | user.mail |
| `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname` | user.givenname |
| `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` | Join (user.surname, " ", user.givenname) |
| `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname` | user.surname |
| `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/email_verified` | "true" |

### 「アプリのフェデレーション メタデータ URL」を metaURL に指定して cdk deploy し直す

```sh
cdk deploy -c env=dev -c metaURL='https://login.microsoftonline.com/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/federationmetadata/2007-06/federationmetadata.xml?appid=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
```
