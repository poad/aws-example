import { BuildSpec, EventAction, FilterGroup, LinuxBuildImage, Project, Source } from 'aws-cdk-lib/aws-codebuild';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';


export interface CustomImageTestStackProps extends cdk.StackProps {
  owner: string,
  repo: string,
  environment: string,
  buildspec: string,
  image: string,
}

export class CustomImageTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CustomImageTestStackProps) {
    super(scope, id, props);

    const repository = Repository.fromRepositoryName(this, 'ECR', 'aws-codebuild-docker-images');

    const projectName = props.environment !== undefined ? `${props.environment}-custom-image-build-test` : 'custom-image-build-test';
    new Project(this, 'CodeBuildProject', {
      projectName,
      source: Source.gitHub({
        owner: props.owner,
        repo: props.repo,
        webhookFilters: [
          FilterGroup.inEventOf(EventAction.PULL_REQUEST_CREATED, EventAction.PULL_REQUEST_REOPENED, EventAction.PULL_REQUEST_UPDATED)
        ]
      }),
      environment: {
        buildImage: LinuxBuildImage.fromDockerRegistry(props.image)
      },
      buildSpec: BuildSpec.fromSourceFilename(props.buildspec)
    });
  }
}
