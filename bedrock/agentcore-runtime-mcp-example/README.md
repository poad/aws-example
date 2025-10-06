# Amazon Bedrock AgentCore Runtime MCP Server example based FastMCP

AWS CDK を使って、@hono/mcp 製 MCP Server を Amazon Bedrock AgentCore Runtime にデプロイして動かすためのサンプルアプリです。

## CDK によってデプロイされる AWS リソース

| リソース種別 | リソース名 |
|------------|----------|
| ECR Repository | agentcore-runtime-mcp-example-stack |
| IAM Role | agentcore-runtime-mcp-example-role |
| BedrockAgentCore Runtime | MyMcpServerExample |
| Cognito User Pool | agentcore-runtime-mcp-example |
| Cognito User Pool Applicaton Client | agentcore-runtime-mcp-example |

上記の他に、[cdklabs/cdk-ecr-deployment](https://github.com/cdklabs/cdk-ecr-deployment#readme) によって生成されるリソースがあります。

## デプロイする OCI イメージの CPU アーキテクチャー

aarch64 (arm64)

## Useful commands

- `pnpm build`   compile typescript to js
- `pnpm watch`   watch for changes and compile
- `pnpm test`    perform the jest unit tests
- `npx -y aws-cdk@latest deploy`  deploy this stack to your default AWS account/region
- `npx -y aws-cdk@latest diff`    compare deployed stack with current state
- `npx -y aws-cdk@latest synth`   emits the synthesized CloudFormation template

## 疎通確認用ヘルパースクリプト

- ./create-user-and-export-token.sh

AWSCLIが実行できる環境で、以下の環境変数を設定して実行してください。

| 環境変数 | 値 |
|---------|----|
| `POOL_ID` | Cognito User Pool の ID |
| `CLIENT_ID` | Cognito User Pool Applicaton Client の ID |
| `AWS_REGION` | AWS リージョン (us-west-2など) |

実行すると、(存在しなければ) `testuser` という Cognito ユーザーが作成された上で、
cognito-idp の InitiateAuth を呼び出して取得されたアクセストークン (毎回、リフレッシュトークンで再取得しなおします)を
`Bearer` を付けてログ出力します。
これを、Roo Code などのエージェントから使用して接続確認を行なってください。

MCP Server としてのエンドポイントは [Deploy MCP servers in AgentCore Runtime](https://docs.aws.amazon.com/ja_jp/bedrock-agentcore/latest/devguide/runtime-mcp.html#runtime-mcp-invoke-server) を参考にしてください。

## 関連ドキュメント

[How Amazon Bedrock AgentCore supports MCP](https://docs.aws.amazon.com/ja_jp/bedrock-agentcore/latest/devguide/runtime-mcp.html#runtime-mcp-how-it-works)
