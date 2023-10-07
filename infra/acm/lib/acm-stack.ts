import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from "aws-cdk-lib/aws-ssm";

export class AcmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const hostedZoneName = ssm.StringParameter.fromStringParameterName(this, 'HostedZoneName', '/route53/hostedZoneName').stringValue;
    const hostedZoneId = ssm.StringParameter.fromStringParameterName(this, 'HostedZoneId', '/route53/hostedZoneId').stringValue;

    const certificate = new acm.Certificate(this, 'ACM', {
      domainName: `*.${hostedZoneName}`,
      validation: acm.CertificateValidation.fromDns(route53.HostedZone.fromHostedZoneId(this, 'HostedZone', hostedZoneId)),
    });

    new cdk.CfnOutput(this, 'AcmArn', {
      value: certificate.certificateArn,
    });

    new ssm.StringParameter(this, 'CertificateArn', {
      parameterName: '/acm/arn',
      dataType: ssm.ParameterDataType.TEXT,
      stringValue: certificate.certificateArn,
    });

  }
}
