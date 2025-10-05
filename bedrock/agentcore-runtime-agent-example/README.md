# Amazon Bedrock AgentCore Runtime example based Mastra

AWS CDK を使って、Mastra 製 Agent を Amazon Bedrock AgentCore Runtime にデプロイして動かすためのサンプルアプリです。

## CDK によってデプロイされる AWS リソース

| リソース種別 | リソース名 |
|------------|----------|
| ECR Repository | agentcore-runtime-agent-example |
| IAM Role | agentcore-runtime-agent-example-role |
| BedrockAgentCore Runtime | MyMastraAgentRuntime |

上記の他に、[cdklabs/cdk-ecr-deployment](https://github.com/cdklabs/cdk-ecr-deployment#readme) によって生成されるリソースがあります。

## 使用するモデル

cdk deploy の context パラメーター `bedrockModelIdentifier` として Bedrock のモデル ID、推論プロファイル ID またはアプリケーション推論プロファイルの ARN を指定します。

## デプロイする OCI イメージの CPU アーキテクチャー

aarch64 (arm64)

## Useful commands

* `pnpm build`   compile typescript to js
* `pnpm watch`   watch for changes and compile
* `pnpm test`    perform the jest unit tests
* `npx -y aws-cdk@latest deploy`  deploy this stack to your default AWS account/region
* `npx -y aws-cdk@latest diff`    compare deployed stack with current state
* `npx -y aws-cdk@latest synth`   emits the synthesized CloudFormation template

## 関連ドキュメント

[Bedrock AgentCore Runtime がHTTPプロトコルでサポートするリクエストのパスについての説明](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-service-contract.html#http-protocol-contract)
