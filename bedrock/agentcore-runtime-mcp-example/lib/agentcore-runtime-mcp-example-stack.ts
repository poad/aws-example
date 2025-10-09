import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import ecrdeploy from 'cdk-ecr-deployment';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AgentcoreRuntimeMcpExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const userPool = new cdk.aws_cognito.UserPool(this, 'UserPool', {
      userPoolName: 'agentcore-runtime-mcp-example',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },
    });

    const userPoolClient = new cdk.aws_cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: userPool,
      userPoolClientName: 'agentcore-runtime-mcp-example',
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true,
        adminUserPassword: true,
      },
    });
    userPoolClient.node.addDependency(userPool);

    const repository = new cdk.aws_ecr.Repository(this, 'Repository', {
      repositoryName: 'agentcore-runtime-mcp-example',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          maxImageCount: 1, // Keep only the latest image
        },
      ],
      emptyOnDelete: true,
    });

    const dockerImageAsset = new cdk.aws_ecr_assets.DockerImageAsset(this, 'DockerImageAsset', {
      directory: path.join(__dirname, '../', 'mcp-server'),
      platform: cdk.aws_ecr_assets.Platform.LINUX_ARM64, // ARM を指定
      file: 'Dockerfile',
    });

    const ecrImageUri = `${repository.repositoryUri}:${new Date().getTime()}-${Math.random().toString(36).substring(2, 7)}`;

    const deploy = new ecrdeploy.ECRDeployment(this, 'DeployDockerImage', {
      src: new ecrdeploy.DockerImageName(dockerImageAsset.imageUri),
      dest: new ecrdeploy.DockerImageName(ecrImageUri),
      imageArch: ['arm64'],
    });

    deploy.node.addDependency(repository);

    const region = cdk.Stack.of(this).region;
    const accountId = cdk.Stack.of(this).account;

    // Create IAM role for Bedrock AgentCore with required policies
    const agentCoreRole = new cdk.aws_iam.Role(this, 'BedrockAgentCoreRole', {
      roleName: 'agentcore-runtime-mcp-example-role',
      assumedBy: new cdk.aws_iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
      description: 'IAM role for Bedrock AgentCore Runtime',
      inlinePolicies: {
        'BedrockAgentCoreRuntimePolicy': new cdk.aws_iam.PolicyDocument({
          statements: [
            new cdk.aws_iam.PolicyStatement({
              sid: 'ECRImageAccess',
              effect: cdk.aws_iam.Effect.ALLOW,
              actions: ['ecr:BatchGetImage', 'ecr:GetDownloadUrlForLayer'],
              resources: [
                `arn:aws:ecr:${region}:${accountId}:repository/${repository}`,
                `arn:aws:ecr:${region}:${accountId}:repository/${repository}/*`,
              ],
            }),
            new cdk.aws_iam.PolicyStatement({
              effect: cdk.aws_iam.Effect.ALLOW,
              actions: ['logs:DescribeLogStreams', 'logs:CreateLogGroup'],
              resources: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/bedrock-agentcore/runtimes/*`],
            }),
            new cdk.aws_iam.PolicyStatement({
              effect: cdk.aws_iam.Effect.ALLOW,
              actions: ['logs:DescribeLogGroups'],
              resources: [`arn:aws:logs:${region}:${accountId}:log-group:*`],
            }),
            new cdk.aws_iam.PolicyStatement({
              effect: cdk.aws_iam.Effect.ALLOW,
              actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*`],
            }),
            new cdk.aws_iam.PolicyStatement({
              sid: 'ECRTokenAccess',
              effect: cdk.aws_iam.Effect.ALLOW,
              actions: ['ecr:GetAuthorizationToken'],
              resources: ['*'],
            }),
            new cdk.aws_iam.PolicyStatement({
              effect: cdk.aws_iam.Effect.ALLOW,
              actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords',
                'xray:GetSamplingRules',
                'xray:GetSamplingTargets',
              ],
              resources: ['*'],
            }),
            new cdk.aws_iam.PolicyStatement({
              effect: cdk.aws_iam.Effect.ALLOW,
              actions: ['cloudwatch:PutMetricData'],
              resources: ['*'],
              conditions: {
                StringEquals: {
                  'cloudwatch:namespace': 'bedrock-agentcore',
                },
              },
            }),
            new cdk.aws_iam.PolicyStatement({
              sid: 'GetAgentAccessToken',
              effect: cdk.aws_iam.Effect.ALLOW,
              actions: [
                'bedrock-agentcore:GetWorkloadAccessToken',
                'bedrock-agentcore:GetWorkloadAccessTokenForJWT',
                'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
              ],
              resources: [
                `arn:aws:bedrock-agentcore:${region}:${accountId}:workload-identity-directory/default`,
                `arn:aws:bedrock-agentcore:${region}:${accountId}:workload-identity-directory/default/workload-identity/*`,
              ],
            }),

          ],
        }),
      },
    });
    agentCoreRole.node.addDependency(deploy);

    const runtime = new cdk.aws_bedrockagentcore.CfnRuntime(this, 'AgentCoreRuntime', {
      agentRuntimeName: 'MyMcpServerExample',
      agentRuntimeArtifact: {
        containerConfiguration: {
          containerUri: ecrImageUri,
        },
      },
      networkConfiguration: {
        networkMode: 'PUBLIC',
      },
      roleArn: agentCoreRole.roleArn,
      protocolConfiguration: 'MCP',
      environmentVariables: {
        AWS_DEFAULT_REGION: region,
      },
      authorizerConfiguration: {
        customJwtAuthorizer: {
          discoveryUrl: `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}/.well-known/openid-configuration`,
          allowedClients: [userPoolClient.userPoolClientId],
        },
      },
    });
    runtime.node.addDependency(userPoolClient);
    runtime.node.addDependency(agentCoreRole);
  }
}
