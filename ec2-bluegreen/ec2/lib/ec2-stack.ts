import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";

interface Ec2StackProps extends cdk.StackProps {
  amiId: string;
  albName: string;
}

export class Ec2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Ec2StackProps) {
    super(scope, id, props);

    const { amiId, albName } = props;
    const { region } = this;

    const acmArn = ssm.StringParameter.fromStringParameterName(
      this,
      "AcmArn",
      "/acm/arn"
    ).stringValue;

    const userData = ec2.UserData.forLinux({});
    userData.addCommands(
      "curl -sSLo /tmp/amazon-ssm-agent.deb https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb",
      "dpkg -i /tmp/amazon-ssm-agent.deb",
      "systemctl status amazon-ssm-agent",
      "systemctl enable amazon-ssm-agent",
      "systemctl start amazon-ssm-agent"
    );

    const cfnKeyPair = new ec2.CfnKeyPair(this, "CfnKeyPair", {
      keyName: "test-key-pair",
    });
    cfnKeyPair.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    new cdk.CfnOutput(this, "GetSSHKeyCommand", {
      value: `aws ssm get-parameter --name /ec2/keypair/${cfnKeyPair.getAtt(
        "KeyPairId"
      )} --region ${
        this.region
      } --with-decryption --query Parameter.Value --output text`,
    });

    const role = new iam.Role(this, "InstanceProfile", {
      roleName: "test-InstanceProfile",
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    });

    const vpc = ec2.Vpc.fromLookup(this, "VPC", { isDefault: false });

    const autoScalingGroups = [
      { name: "blue", count: 1 },
      { name: "green", count: 0 },
    ].map(({ name: autoScalingGroupName, count }) => {
      return {
        autoScalingGroupName,
        autoScalingGroup: new autoscaling.AutoScalingGroup(
          this,
          `AutoScalingGroup-${autoScalingGroupName}`,
          {
            autoScalingGroupName,
            vpc,
            vpcSubnets: {
              subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            instanceType: ec2.InstanceType.of(
              ec2.InstanceClass.T3A,
              ec2.InstanceSize.SMALL
            ),
            minCapacity: count,
            maxCapacity: count,
            machineImage: ec2.MachineImage.genericLinux(
              { [region]: amiId },
              {
                userData,
              }
            ),
            keyName: cdk.Token.asString(cfnKeyPair.ref),
            ssmSessionPermissions: true,
            role: role,
            userData: userData,
          }
        ),
      };
    });

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

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId,
      zoneName: hostedZoneName,
    });

    // create a load balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc,
      internetFacing: true,
      loadBalancerName: albName,
    });

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "Certificate",
      acmArn
    );

    const defaultTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      `default-target`,
      {
        port: 80,
        targets: [autoScalingGroups[0].autoScalingGroup],
        healthCheck: {
          enabled: true,
          path: "/health",
        },
        targetGroupName: 'default',
        vpc,
      }
    );
    const listener = alb.addListener("Listener", {
      protocol: elbv2.ApplicationProtocol.HTTPS,
      port: 443,
      certificates: [certificate],
      defaultAction: elbv2.ListenerAction.forward([defaultTargetGroup]),
    });

    autoScalingGroups.map(({autoScalingGroup, autoScalingGroupName}, index) => {
      listener.addTargets(
        `Targets-${autoScalingGroupName}`,
        {
          port: 80,
          targets: [autoScalingGroup],
          healthCheck: {
            enabled: true,
            path: "/health",
          },
          targetGroupName: autoScalingGroupName,
          conditions: [
            elbv2.ListenerCondition.pathPatterns([
              `/${autoScalingGroupName}`,
            ]),
          ],
          priority: index + 1,
        }
      );
    })


    // // add a scaling rule
    // autoScalingGroups.forEach(({ autoScalingGroup: asg }) => {
    //   asg.scaleOnRequestCount(`AModestLoad-${asg}`, {
    //     targetRequestsPerMinute: 1,
    //   });
    // });

    const domainName = `ec2-bluegreen-alb.${hostedZoneName}`;
    new route53.ARecord(this, "ARecord", {
      recordName: domainName,
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new route53targets.LoadBalancerTarget(alb)
      ),
    });

    new cdk.CfnOutput(this, "AlbArn", {
      value: alb.loadBalancerArn,
    });

    new ssm.StringParameter(this, "AlbArnParam", {
      parameterName: "/ec2-bluegreen/alb/arn",
      dataType: ssm.ParameterDataType.TEXT,
      stringValue: alb.loadBalancerArn,
    });

    new cdk.CfnOutput(this, "AlbDomainName", {
      value: domainName,
    });
  }
}
