import { CfnMapping, Stack, StackProps } from 'aws-cdk-lib';
import { BuildEnvironmentVariableType, BuildSpec, ComputeType, EventAction, FilterGroup, LinuxArmBuildImage, LinuxBuildImage, Project, Source } from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';

interface InfraStackProps extends StackProps {
  repo: string,
  owner: string,
  branch: string,
  tokenParam: string,
  archType: string,
}

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { repo, owner, branch, tokenParam, archType } = props;

    const archMap = new CfnMapping(this, 'ArchMapping', {
      mapping: {
        'x86': {
          'image': LinuxBuildImage.STANDARD_5_0.imageId,
          'path': 'amd64',
        },
        'arm': {
          'image': LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_2_0.imageId,
          'path': 'aarch64',
        },
      }
    });

    new Project(this, 'CodeBuildProject', {
      projectName: 'webhook',
      artifacts: undefined,
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
          IMAGE_TAG: {
            type: BuildEnvironmentVariableType.PLAINTEXT,
            value: 'latest',
          },
        },
      },
      source: Source.gitHub({
        owner,
        repo,
        webhook: true,
        webhookFilters: [
          FilterGroup.inEventOf(
            EventAction.PULL_REQUEST_CREATED,
            EventAction.PULL_REQUEST_UPDATED,
            EventAction.PULL_REQUEST_REOPENED,
          ).andBaseRefIs(branch)
            .andFilePathIs('codebuild/codebuild-webhook-project/*'),
          FilterGroup.inEventOf(
            EventAction.PUSH,
          ).andHeadRefIs(branch).andFilePathIs('codebuild/codebuild-webhook-project/*'),
        ],
      }),
      buildSpec: BuildSpec.fromObjectToYaml({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              python: 3.9
            },
            commands: [
              'curl -sSL https://download.bell-sw.com/pki/GPG-KEY-bellsoft | apt-key add -',
              'echo "deb [arch=amd64] https://apt.bell-sw.com/ stable main" > /etc/apt/sources.list.d/bellsoft.list',
              'apt-get update -qq',
              'apt-get purge -qqy java-1.8.0-amazon-corretto-jdk java-11-amazon-corretto-jdk',
              'DEBIAN_FRONTEND=noninteractive apt-get full-upgrade -qqy --no-install-recommends',
              'DEBIAN_FRONTEND=noninteractive apt-get install -qqy --no-install-recommends bellsoft-java11',
            ]
          },
          build: {
            commands: [
              'cd codebuild/codebuild-webhook-project',
              `JAVA_HOME=/usr/lib/jvm/bellsoft-java11-${archMap.findInMap(archType, "path")} ./gradlew clean test`,
            ]
          },
        },
        reports: {
          SurefireReports: {
            files: [
              '**/*',
            ],
            'base-directory': 'codebuild/codebuild-webhook-project/app/build/test-results',
            'discard-paths': 'no',
            'file-format': 'JunitXml'
          }
        },
        cache: {
          paths: [
            '/root/.gradle/**/*'
          ]
        },
      }),
    });
  }
}
