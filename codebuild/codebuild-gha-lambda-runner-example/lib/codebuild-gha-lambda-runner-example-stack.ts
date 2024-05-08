import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codebuild from "aws-cdk-lib/aws-codebuild";

export class CodebuildGhaLambdaRunnerExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const project = new codebuild.Project(this, "CodeBuildProject", {
      projectName: "codebuild-gha-lambda-runner-example",
      source: codebuild.Source.gitHub({
        owner: "poad",
        repo: "aws-codebuild-github-lambda-runner-node-example",
        webhook: true,
        webhookFilters: [
          codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH),
        ],
      }),
      environment: {
        buildImage:
          codebuild.LinuxArmLambdaBuildImage.AMAZON_LINUX_2023_NODE_20,
        computeType: codebuild.ComputeType.LAMBDA_1GB,
      },
    });

    const cfnProject = project.node.defaultChild as codebuild.CfnProject;
    cfnProject.addOverride(
      "Properties.Triggers.FilterGroups.0.0.Pattern",
      "WORKFLOW_JOB_QUEUED",
    );
  }
}
