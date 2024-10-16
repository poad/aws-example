# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `pnpm run build`   compile typescript to js
* `pnpm run watch`   watch for changes and compile
* `pnpm run test`    perform the jest unit tests
* `pnpm dlx cdk deploy`  deploy this stack to your default AWS account/region
* `pnpm dlx cdk diff`    compare deployed stack with current state
* `pnpm dlx cdk synth`   emits the synthesized CloudFormation template

### Usage

1. cdk deploy
```shell
cdk deploy -c account=${AWS AccountID}
```
2. Open [AWS Console](https://us-west-2.console.aws.amazon.com/codesuite/settings/connections?region=us-west-2&connections-meta=eyJmIjp7InRleHQiOiIifSwicyI6e30sIm4iOjIwLCJpIjowfQ)
3. Click "github-connection" link.
4. Click "Update pendding connection" button.
  - For details on the procedure, see the [AWS Documentation](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-create-github.html).
