import { Stack, StackProps, RemovalPolicy, SecretValue, CfnMapping } from 'aws-cdk-lib';
import { BuildEnvironmentVariableType, BuildSpec, ComputeType, LinuxArmBuildImage, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

type ArchType = 'x86' | 'arm';

interface InfraStackProps extends StackProps {
  infra: {
    repo: string,
    owner: string,
    branch: string,
    tokenParam: string,
  },
  app: {
    repo: string,
    owner: string,
    branch: string,
    tokenParam: string,
  },
  jdk: {
    majorVersion: string,
    minorRevision: string,
    buildNumber: string,
    esum: string,
  },
  archType: ArchType,
}

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { infra, app, jdk, archType } = props;

    const archMap = new CfnMapping(this, 'ArchMapping', {
      mapping: {
        'x86': {
          'image': LinuxBuildImage.STANDARD_5_0.imageId,
          'jdkUrl': 'x64',
          'jdkPath': 'amd64',
        },
        'arm': {
          'image': LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_2_0.imageId,
          'jdkUrl': 'aarch64',
          'jdkPath': 'aarch64',
        },
      }
    });

    const infraRepo = infra.repo;
    const infraOwner = infra.owner;
    const infraRepoSourceBranch = infra.branch;
    
    const infraRepoOAuthToken = StringParameter.fromStringParameterName(this, 'InfraRepoOAuthToken', infra.tokenParam).stringValue;
    
    const appRepo = app.repo;
    const appRepoOwner = app.owner;
    const appSourceBranch = app.branch;
    const appRepoOAuthToken = StringParameter.fromStringParameterName(this, 'AppRepoOAuthToken', app.tokenParam).stringValue;;

    const javaMajorVersion = jdk.majorVersion;
    const javaMinorRevision = jdk.minorRevision;
    const javaBuildNumber = jdk.buildNumber;
    const jdkEsum = jdk.esum;

    const codeBuildProjectRole = new Role(this, 'CodeBuildRole', {
      roleName: `${this.stackName}-project-role`,
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
    });

    new Repository(this, 'ECRRepogitory', {
      repositoryName: appRepo,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const buildPrj = new PipelineProject(this, 'AppBuildCodeBuildProject', {
      projectName: `${appRepo}-build`,
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
          IMAGE_REPO_NAME: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: appRepo,
          },
          JAVA_BUILD_NUMBER: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: javaBuildNumber,
          },
          JDK_ESUM: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: jdkEsum,
          },
          JAVA_MAJOR_MINOR_REVISION: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: `${javaMajorVersion}.${javaMinorRevision}`,
          },
          JAVA_VERSION: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: `${javaMajorVersion}.${javaMinorRevision}_${javaBuildNumber}`,
          },
          JAVA_HOME: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: `/usr/lib/jvm/java-${javaMajorVersion}.${javaMinorRevision}_${javaBuildNumber}-openjdk-${archMap.findInMap(archType, 'jdkPath')}`,
          },
          JAVA_URL: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: `https://github.com/adoptium/temurin11-binaries/releases/download/jdk-${javaMajorVersion}.${javaMinorRevision}%2B${javaBuildNumber}/OpenJDK${javaMajorVersion}U-jdk_${archMap.findInMap(archType, 'jdkUrl')}_linux_hotspot_${javaMajorVersion}.${javaMinorRevision}_${javaBuildNumber}.tar.gz`,
          },
        }
      },
      buildSpec: BuildSpec.fromSourceFilename('codepipeline/adoptium-temurin-jib/buildspec.yml'),
      role: codeBuildProjectRole
    });

    const taggingPrj = new PipelineProject(this, 'AddTagCodeBuildProject', {
      projectName: `${appRepo}-add-tag`,
      environment: {
        buildImage: LinuxBuildImage.STANDARD_5_0,
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
          IMAGE_REPO_NAME: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: appRepo,
          },
          JAVA_BUILD_NUMBER: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: javaBuildNumber,
          },
          JDK_ESUM: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: jdkEsum,
          },
          JAVA_MAJOR_MINOR_REVISION: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: `${javaMajorVersion}.${javaMinorRevision}`,
          },
          JAVA_VERSION: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: `${javaMajorVersion}.${javaMinorRevision}_${javaBuildNumber}`,
          },
          JAVA_HOME: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: `/usr/lib/jvm/java-${javaMajorVersion}.${javaMinorRevision}_${javaBuildNumber}-openjdk-amd64`,
          },
          JAVA_URL: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: `https://github.com/adoptium/temurin11-binaries/releases/download/jdk-${javaMajorVersion}.${javaMinorRevision}%2B${javaBuildNumber}/OpenJDK${javaMajorVersion}U-jdk_x64_linux_hotspot_${javaMajorVersion}.${javaMinorRevision}_${javaBuildNumber}.tar.gz`,
          },
        }
      },
      buildSpec: BuildSpec.fromObjectToYaml({
        version: '0.2',

        phases: {
          install: {
            'runtime-versions': {
              docker: 18
            },
            commands: [
              'apt-get -qq update',
              'apt-get -qqy install --no-install-recommends jq',
            ]
          },
          build: {
            commands :[
              'mkdir -p work',
              'cd work',
              `USER=$(curl - H "Authorization: token ${appRepoOAuthToken}" https://api.github.com/user)`,
              'USER_ID=$(echo $USER | jq ".login")',
              'EMAIL=$(echo $USER | jq ".email")',
              'git config --global user.email "$EMAIL"',
              'git config --global user.name "$USER_ID"',
              `git clone https://${appRepoOwner}:${appRepoOAuthToken}@github.com/${appRepoOwner}/${appRepo}.git --branch ${appSourceBranch}`,
              `cd ${ appRepo }`,
              'VERSION=$(cat $CODEBUILD_SRC_DIR_BuildResult / version.txt)',
              'TAG=$VERSION - $(date +% Y % m % d.% H % M % S)',
              'git tag $TAG',
              'git push origin $TAG',
            ]
          }
        }
      }),
      role: codeBuildProjectRole
    });

    const dockerSourceArtifact = new Artifact('DockerSource');
    const appSourceArtifact = new Artifact('AppSource');

    const artifactBucket = StringParameter.fromStringParameterName(this, 'ArtifactStoreName', '/infta/codepipeline/ArtifactStore').stringValue;

    new Pipeline(this, 'DockerBuildCodePipeline', {
      pipelineName: `${appRepo}-deploy`,
      artifactBucket: Bucket.fromBucketName(this, 'ArtifactStore', artifactBucket),
      restartExecutionOnUpdate: false,
      role: new Role(this, 'CodePipelineRole', {
        roleName: `${appRepo}-deploy-project-role`,
        assumedBy: new ServicePrincipal('codepipeline.amazonaws.com'),
        path: '/',
        inlinePolicies: {
          'CodePipelinePolicy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                sid: 's3ReadAccess',
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
              repo: infraRepo,
              owner: infraOwner,
              oauthToken: SecretValue.unsafePlainText(infraRepoOAuthToken),
              branch: infraRepoSourceBranch,
              actionName: 'DockerSource',
              output: dockerSourceArtifact,
              runOrder: 1
            }),
            new GitHubSourceAction({
              repo: appRepo,
              owner: appRepoOwner,
              oauthToken: SecretValue.unsafePlainText(appRepoOAuthToken),
              branch: appSourceBranch,
              actionName: 'AppSource',
              output: appSourceArtifact,
              runOrder: 1
            }),
          ]
        },
        {
          stageName: 'Build',
          actions: [
            new CodeBuildAction({
              project: buildPrj,
              actionName: 'BuildAndPush',
              input: dockerSourceArtifact,
              extraInputs: [
                appSourceArtifact
              ],
              outputs: [
                new Artifact('BuildResult')
              ],
              runOrder: 1
            }),
          ]
        },
        {
          stageName: 'Finalize',
          actions: [
            new CodeBuildAction({
              project: taggingPrj,
              actionName: 'AddTag',
              input: appSourceArtifact,
              extraInputs: [
                dockerSourceArtifact
              ],
              runOrder: 1
            }),
          ]
        },
      ]
    });
  }
}
