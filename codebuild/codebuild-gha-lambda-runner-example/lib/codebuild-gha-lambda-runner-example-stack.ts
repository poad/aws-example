import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import * as awslogs from "aws-cdk-lib/aws-logs";

interface CodebuildGhaLambdaRunnerExampleStackProps extends cdk.StackProps {
  projects: {
    projectName: string,
    owner: string,
    repo: string,
    buildImage: cdk.aws_codebuild.IBuildImage,
    prefix: string,
    customImage?: string,
  }[]
}

export class CodebuildGhaLambdaRunnerExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CodebuildGhaLambdaRunnerExampleStackProps) {
    super(scope, id, props);

    props.projects.forEach(({
      projectName,
      owner,
      repo,
      buildImage,
      prefix,
      customImage,
    }) => {
      const logs = new awslogs.LogGroup(this, `${prefix}LogGroup`, {
        logGroupName: `/aws/codebuild/${projectName}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: awslogs.RetentionDays.ONE_DAY,
      });

      const role = new iam.Role(this, `${prefix}ProjectRole`, {
        roleName: `${projectName}-service-role`,
        assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [
                  `${logs.logGroupArn}:*`
                ],
              }),
            ],
          }),
          's3-policy': new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  "s3:PutObject",
                  "s3:GetObject",
                  "s3:GetObjectVersion",
                  "s3:GetBucketAcl",
                  "s3:GetBucketLocation"
                ],
                resources: [
                  `arn:aws:s3:::codepipeline-${this.region}:*`
                ],
              }),
            ],
          }),
          'codebuild-policy': new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  "codebuild:CreateReportGroup",
                  "codebuild:CreateReport",
                  "codebuild:UpdateReport",
                  "codebuild:BatchPutTestCases",
                  "codebuild:BatchPutCodeCoverages"
                ],
                resources: [
                  `arn:aws:codebuild:${this.region}:${this.account}:report-group/${projectName}-*`
                ],
              }),
            ],
          }),

        },

      });

      const project = new codebuild.Project(this, `${prefix}CodeBuildProject`, {
        projectName,
        source: codebuild.Source.gitHub({
          owner,
          repo,
          webhook: true,
          webhookFilters: [
            codebuild.FilterGroup.inEventOf(codebuild.EventAction.WORKFLOW_JOB_QUEUED),
          ],
        }),
        environment: {
          buildImage,
          computeType: codebuild.ComputeType.LAMBDA_1GB,
        },
        role,
      });

      const cfnProject = project.node.defaultChild as codebuild.CfnProject;
      if (customImage) {
        cfnProject.addOverride(
          "Properties.Environment.Image",
          customImage,
        );
        cfnProject.addPropertyOverride(
          'Environment.ImagePullCredentialsType',
          'SERVICE_ROLE'
        );
      }
    });
  }
}
