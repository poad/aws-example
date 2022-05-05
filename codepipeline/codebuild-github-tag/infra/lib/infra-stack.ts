import { CfnMapping, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { BuildEnvironmentVariableType, BuildSpec, ComputeType, LinuxArmBuildImage, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface InfraStackProps extends StackProps {
  repo: string,
  owner: string,
  branch: string,
  tokenParam: string,
  gitHubTag: string,
  archType: string,
}
export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { repo, owner, branch, tokenParam, gitHubTag, archType } = props;

    const archMap = new CfnMapping(this, 'ArchMapping', {
      mapping: {
        'x86': {
          'image': LinuxBuildImage.STANDARD_5_0.imageId,
        },
        'arm': {
          'image': LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_2_0.imageId,
        },
      }
    });

    const gitHubOAuthToken = StringParameter.fromStringParameterName(this, 'GitHubOAuthToken', tokenParam).stringValue;

    const codeBuildProject = new PipelineProject(this, 'CodeBuildProject', {
      projectName: 'codebuild-github-tag',
      environment: {
        buildImage: LinuxBuildImage.fromCodeBuildImageId(archMap.findInMap(archType, 'image')),
        computeType: ComputeType.SMALL,
        privileged: true,
        environmentVariables: {
          AWS_DEFAULT_REGION: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: this.region,
          },
          AWS_ACCOUNT_ID: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: this.account,
          },
          GITHUB_TAG: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: gitHubTag,
          },
          OWNER: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: owner,
          },
          REPO: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: repo,
          },
          BRANCH: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: branch,
          },
          TOKEN: {
            type: BuildEnvironmentVariableType.PARAMETER_STORE,
            value: tokenParam,
          },
        }
      },
      buildSpec: BuildSpec.fromSourceFilename('codepipeline/codebuild-github-tag/buildspec.yml'),
      role: new Role(this, 'ImageCodeBuildRole', {
        roleName: 'codebuild-github-tag-project-role',
        assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
        path: '/',
        inlinePolicies: {
          'CodeBuildAccess': new PolicyDocument({
            statements: [
              new PolicyStatement({
                sid: 's3Access',
                actions: [
                  's3:PutObject',
                  's3:GetBucketPolicy',
                  's3:GetObject',
                  's3:ListBucket'
                ],
                resources: ['*'],
                effect: Effect.ALLOW
              }),
              new PolicyStatement({
                sid: 'awslogsAccess',
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents'
                ],
                resources: ['arn:aws:logs:*:*:*'],
                effect: Effect.ALLOW
              }),
              new PolicyStatement({
                sid: 'ecrAccess',
                actions: [
                  'ecr:CreateRepository',
                  'ecr:BatchCheckLayerAvailability',
                  'ecr:CompleteLayerUpload',
                  'ecr:GetAuthorizationToken',
                  'ecr:InitiateLayerUpload',
                  'ecr:PutImage',
                  'ecr:UploadLayerPart',
                ],
                resources: ['*'],
                effect: Effect.ALLOW
              }),
            ]
          })
        }
      })
    });

    const infraSourceArtifact = new Artifact('InfraSource');

    const artifactBucket = StringParameter.fromStringParameterName(this, 'ArtifactStoreName', '/infta/codepipeline/ArtifactStore').stringValue;

    new Pipeline(this, 'DockerBuildCodePipeline', {
      pipelineName: 'codebuild-github-push-tag',
      artifactBucket: Bucket.fromBucketName(this, 'ArtifactStore', artifactBucket),
      restartExecutionOnUpdate: false,
      role: new Role(this, 'CodePipelineRole', {
        roleName: 'codebuild-github-push-tag-project-role',
        assumedBy: new ServicePrincipal('codepipeline.amazonaws.com'),
        path: '/',
        inlinePolicies: {
          'CodePipelinePolicy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                sid: 's3ReadAccess',
                actions: [
                  's3:PutObject',
                  's3:GetObjectVersion',
                  's3:GetBucketVersioning',
                ],
                resources: ['*'],
                effect: Effect.ALLOW
              }),
              new PolicyStatement({
                sid: 's3WriteAccess',
                actions: [
                  's3:PutObject'
                ],
                resources: ['arn:aws:s3:::*'],
                effect: Effect.ALLOW
              }),
              new PolicyStatement({
                sid: 'default',
                actions: [
                  'codepipeline:*',
                  'iam:CreateRole',
                  'iam:DeleteRole',
                  'iam:ListRoles',
                  'iam:PassRole',
                  'iam:AttachRolePolicy',
                  'iam:DetachRolePolicy',
                  'iam:CreatePolicy',
                  'iam:DeletePolicy',
                  'cloudformation:Describe*',
                  'cloudFormation:List*',
                  'cloudformation:CreateStack',
                  'cloudformation:DeleteStack',
                  'cloudformation:DescribeStacks',
                  'cloudformation:UpdateStack',
                  'cloudformation:CreateChangeSet',
                  'cloudformation:DeleteChangeSet',
                  'cloudformation:DescribeChangeSet',
                  'cloudformation:ExecuteChangeSet',
                  'cloudformation:SetStackPolicy',
                  'cloudformation:ValidateTemplate',
                  's3:ListAllMyBuckets',
                  's3:GetBucketLocation',
                ],
                resources: ['*'],
                effect: Effect.ALLOW
              }),
              new PolicyStatement({
                sid: 'codebuildAccess',
                actions: [
                  'codebuild:BatchGetBuilds',
                  'codebuild:StartBuild'
                ],
                resources: ['*'],
                effect: Effect.ALLOW
              }),
            ]
          })
        }
      }),
      stages: [
        {
          stageName: 'Source',
          actions: [
            new GitHubSourceAction({
              repo,
              owner,
              oauthToken: SecretValue.unsafePlainText(gitHubOAuthToken),
              branch,
              actionName: 'GitHubSource',
              output: infraSourceArtifact,
              runOrder: 1
            }),
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              project: codeBuildProject,
              actionName: 'BuildAndPush',
              input: infraSourceArtifact,
              runOrder: 1
            }),
          ]
        },
      ]
    });
  }
}
