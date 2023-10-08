import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ssm from "aws-cdk-lib/aws-ssm";

/**
 * Gets a value or throws an exception.
 *
 * @param value A value, possibly undefined
 * @param err The error to throw if `value` is undefined.
 */
const valueOrDie = <T, C extends T = T>(
  value: T | undefined,
  err: Error
): C => {
  if (value === undefined) throw err;
  return value as C;
};

export class VpcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const subnetsConfigs = [
      {
        subnetType: ec2.SubnetType.PUBLIC,
        name: "Public",
        cidrMask: 28,
        mapPublicIpOnLaunch: false,
      },
      {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        name: "Private",
        cidrMask: 21,
      },
    ];

    const vpc = new ec2.Vpc(this, "VPC", {
      ipAddresses: ec2.IpAddresses.cidr("172.31.0.0/16"),
      maxAzs: 4,
      subnetConfiguration: subnetsConfigs,
      vpcName: 'vpc',
    });

    const ipv6Cidr = new ec2.CfnVPCCidrBlock(this, "Ipv6Cidr", {
      vpcId: vpc.vpcId,
      amazonProvidedIpv6CidrBlock: true,
    });

    // Get the vpc's internet gateway so we can create default routes for the
    // public subnets.
    const internetGateway = valueOrDie<Construct, ec2.CfnInternetGateway>(
      vpc.node.children.find((c) => c instanceof ec2.CfnInternetGateway),
      new Error("Couldn't find an internet gateway")
    );

    vpc.publicSubnets.forEach((subnet, idx) => {
      // Add a default ipv6 route to the subnet's route table.
      const unboxedSubnet = subnet as ec2.Subnet;
      unboxedSubnet.addRoute("IPv6Default", {
        routerId: internetGateway.ref,
        routerType: ec2.RouterType.GATEWAY,
        destinationIpv6CidrBlock: "::/0",
      });

      // Find a CfnSubnet (raw cloudformation resources) child to the public
      // subnet nodes.
      const cfnSubnet = valueOrDie<Construct, ec2.CfnSubnet>(
        subnet.node.children.find((c) => c instanceof ec2.CfnSubnet),
        new Error("Couldn't find a CfnSubnet")
      );

      // Use the intrinsic Fn::Cidr CloudFormation function on the VPC's
      // first IPv6 block to determine ipv6 /64 cidrs for each subnet as
      // a function of the public subnet's index.
      const vpcCidrBlock = cdk.Fn.select(0, vpc.vpcIpv6CidrBlocks);
      const ipv6Cidrs = cdk.Fn.cidr(vpcCidrBlock, 256, "64");
      cfnSubnet.ipv6CidrBlock = cdk.Fn.select(idx, ipv6Cidrs);

      // The subnet depends on the ipv6 cidr being allocated.
      cfnSubnet.addDependency(ipv6Cidr);
    });

    // Modify each private subnet so that it has both a public route and an ipv6
    // CIDR.

    vpc.privateSubnets.forEach((subnet, idx) => {
      // Add a default ipv6 route to the subnet's route table.
      const unboxedSubnet = subnet as ec2.Subnet;
      unboxedSubnet.addRoute("IPv6Default", {
        routerId: internetGateway.ref,
        routerType: ec2.RouterType.GATEWAY,
        destinationIpv6CidrBlock: "::/0",
      });

      // Find a CfnSubnet (raw cloudformation resources) child to the public
      // subnet nodes.
      const cfnSubnet = valueOrDie<Construct, ec2.CfnSubnet>(
        subnet.node.children.find((c) => c instanceof ec2.CfnSubnet),
        new Error("Couldn't find a CfnSubnet")
      );

      // Use the intrinsic Fn::Cidr CloudFormation function on the VPC's
      // first IPv6 block to determine ipv6 /64 cidrs for each subnet as
      // a function of the private subnet's index.
      const vpcCidrBlock = cdk.Fn.select(0, vpc.vpcIpv6CidrBlocks);
      const ipv6Cidrs = cdk.Fn.cidr(vpcCidrBlock, 256, "64");
      cfnSubnet.ipv6CidrBlock = cdk.Fn.select(idx + 3, ipv6Cidrs);

      // The subnet depends on the ipv6 cidr being allocated.
      cfnSubnet.addDependency(ipv6Cidr);

      new ssm.StringParameter(this, 'VpcId', {
        parameterName: '/vpc/id',
        dataType: ssm.ParameterDataType.TEXT,
        stringValue: vpc.vpcId,
      });
    });
  }
}
