import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";

export class CloudfrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hostedZoneName = ssm.StringParameter.fromStringParameterName(
      this,
      "HostedZoneName",
      "/route53/hostedZoneName"
    ).stringValue;

    const hostedZoneId = ssm.StringParameter.fromStringParameterName(
      this,
      "HostedZoneId",
      "/route53/hostedZoneId"
    ).stringValue;

    const albArn = ssm.StringParameter.fromStringParameterName(
      this,
      "AlbArn",
      "/ec2-bluegreen/alb/arn"
    ).stringValue;

    const acmArn = ssm.StringParameter.fromStringParameterName(
      this,
      "AcmArn",
      "/acm/arn"
    ).stringValue;

    new cloudfront.Distribution(this, "Distoribution", {
      defaultBehavior: {
        origin: new origins.LoadBalancerV2Origin(
          elbv2.ApplicationLoadBalancer.fromLookup(this, "ALB", {
            loadBalancerArn: albArn,
          }),
        ),
      },
      certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', acmArn),

    });
  }
}
