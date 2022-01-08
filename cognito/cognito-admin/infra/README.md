# Welcome to your CDK TypeScript project

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## deploy and configure

### deploy

```sh
cdk deploy --require-approval=never -c env=dev
```

### Conffigure Cognito User Pool

#### 設定

env=dev の場合

1. ユーザープール `dev-cognito-admin-end-user-pool` の管理コンソールを開く
2. 「フェデレーション」 -> 「ID プロバイダを有効化...」->「OpenID Connect」
3. 「プロバイダ名」に「AdminPool」、「クライアントID」に ユーザープール `dev-cognito-admin-user-pool` の アプリクライアント「dev-admin-user-pool-client」の「クライアントID」を入力
4. 「承認スコープ」に `email openid profile` を、「発行者」に `https://cognito-idp.<リージョン>.amazonaws.com/ユーザープール 「dev-cognito-admin-user-pool」のユーザープールID` をそれぞれ入力して「検出の実行」をクリック
5. 成功したら「プロバイダーの作成」をクリック
6. 「属性マッピング」へ移動し「OIDC 属性の追加」をクリック
7. 「OIDC 属性」に `email` を入力し、「ユーザープール属性」は「Email」を選択する
8. 「変更の保存」をクリック
9. 「アプリクライアントの設定」へ移動し、アプリ区アイアント「dev-end-user-pool-client」の「有効な ID プロバイダ」で「AdminPool」のチェックを入れる

#### 確認

```nohilight
https://<ユーザープール dev-cognito-admin-end-user-pool のぢメインプレフィックス>.auth.<リージョン>.amazoncognito.com/oauth2/authorize?response_type=code&client_id=アプリクライアント「dev-end-user-pool-client」の「クライアントID」&redirect_uri=http://localhost:3000
```
