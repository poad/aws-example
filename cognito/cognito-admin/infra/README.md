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

#### 確認

```nohilight
https://<ユーザープール dev-cognito-admin-end-user-pool のドメインプレフィックス>.auth.<リージョン>.amazoncognito.com/oauth2/authorize?response_type=code&client_id=アプリクライアント「dev-end-user-pool-client」の「クライアントID」&redirect_uri=http://localhost:3000
```
