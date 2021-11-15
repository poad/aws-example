# cognito-s3-example

## Setup

1. IAMロールを作成する
2. Cognito User Pool/Cognito Identity Pool を作る
Cognito Identity Pool は　Storage(S3) アクセスのために必要。
  1. Cognito User Pool を作る(Web Client/非Web Clientも作成する)
  2. Cognito Identity Pool(認証プロバイダーに「上記で作ったUser Poolを指定する)
3. S3バケットを作る
4. src/.env.{environment} ファイルに上記設定を記述する
```
NEXT_PUBLIC_AWS_REGION="{AWSのリージョン}"
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID="{Cognito User PoolのID}"
NEXT_PUBLIC_AWS_WEB_CLIENT_ID="{Cognito User PoolのWeb Client ID}"
NEXT_PUBLIC_AWS_S3_BUCKET={S3バケット名}"
NEXT_PUBLIC_AWS_COGNITO_ID_POOL_ID="{Cognito Identity PoolのID}"
NEXT_PUBLIC_AWS_COGNITO_OAUTH_DOMAIN="{Cognito User PoolのOAuthドメイン}"
NEXT_PUBLIC_AWS_COGNITO_OAUTH_REDIRECT_SIGNIN="{Cognito User PoolのWeb Client のcallbackUrl}"
NEXT_PUBLIC_AWS_COGNITO_OAUTH_REDIRECT_SIGNOUT="{Cognito User PoolのWeb Client のlogoutUrl}"
NEXT_PUBLIC_AWS_S3_PUBLIC_PREFIX=""
NEXT_PUBLIC_AWS_S3_PREFIX="contents"

```
5. S3バケットのCORSを設定する
```
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<CORSRule>
    <ID>S3CORSRule</ID>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>GET</AllowedMethod>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
    <ExposeHeader>x-amz-server-side-encryption</ExposeHeader>
    <ExposeHeader>x-amz-request-id</ExposeHeader>
    <ExposeHeader>x-amz-id-2</ExposeHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <AllowedHeader>*</AllowedHeader>
</CORSRule>
</CORSConfiguration>
```
6. `yarn start` してローカルで動作確認する
7. `yarn build` してトランスパイルと静的ページを出力する
8. buildディレクトリー配下をS3バケットへアップロードする
9. sample 配下をS3バケットへアップロードする
10. 公開する
