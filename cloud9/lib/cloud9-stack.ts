import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { BlockDeviceVolume, EbsDeviceVolumeType, InstanceType, MachineImage, Peer, Port, SecurityGroup, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import fetch from 'cross-fetch';

interface Cloud9StackProps extends cdk.StackProps {
  name: string,
  instanceType: string,
  ami?: string,
  vpc?: string,
  subnet?: {
    subnetId: string,
    availabilityZone: string,
  },
}

export class Cloud9Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Cloud9StackProps) {
    super(scope, id, props);

    const { name, ami, vpc: vpcId, instanceType, subnet, env } = props;

    const amiId = ami || StringParameter.valueFromLookup(this, '/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2');

    const vpc = vpcId ? Vpc.fromLookup(this, 'Vpc', { vpcId }) : Vpc.fromLookup(this, 'DefaultVPC', { isDefault: true });

    const eni = subnet ? new ec2.CfnNetworkInterface(this, 'ENI', {
      subnetId: subnet.subnetId,
    }) : undefined;

    const subnetAttr = subnet ? { subnetId: subnet.subnetId, availabilityZone: subnet.availabilityZone } : { subnetId: vpc.publicSubnets[0].subnetId, availabilityZone: vpc.publicSubnets[0].availabilityZone };
    const vpcSubnets = { subnets: [ec2.Subnet.fromSubnetAttributes(this, 'Subnet', subnetAttr)] };

    const userData = UserData.forLinux();
    userData.addCommands(
      'apt update -qqq && DEBIAN_FRONTEND=noninteractive apt full-upgrade -qqy',
      'DEBIAN_FRONTEND=noninteractive curl -fsSL https://deb.nodesource.com/setup_lts.x -o /tmp/setup_lts.x && bash /tmp/setup_lts.x && rm -rf /tmp/setup_lts.x',
      'DEBIAN_FRONTEND=noninteractive apt install -qqqy --no-install-recommends git build-essential python2 nodejs zsh software-properties-common zip unzip zlib1g-dev libssl-dev libreadline-dev libbz2-dev libncurses-dev libffi-dev libsqlite3-dev liblzma-dev',
      'add-apt-repository ppa:git-core/ppa -y',
      'CUR=$(pwd) && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip" && cd /tmp && unzip awscliv2.zip && ./aws/install && cd ${CUR} && rm -rf /tmp/awscliv2.zip rm -rf /tmp/aws',
      'wget -O- https://aka.ms/install-vscode-server/setup.sh | sh',
      `
      cat << EOS >> /usr/lib/systemd/system/code-server@.service
[Unit]
Description=code-server
After=network.target

[Service]
Type=exec
ExecStart=/usr/local/bin/code-server serve-local --accept-server-license-terms --host 0.0.0.0 --port 8080 --without-connection-token
#ExecStop=/usr/local/bin/code-server kill
#ExecStopPost=/usr/local/bin/code-server prune
Restart=always
User=%1

[Install]
WantedBy=default.target
EOS
      `,
      'mkdir -p /home/ubuntu/environment && chown -R ubuntu:ubuntu /home/ubuntu/environment',
      'DEBIAN_FRONTEND=noninteractive curl -L https://raw.githubusercontent.com/c9/install/master/install.sh -o /tmp/install.sh && sudo -u ubuntu -c "bash /tmp/install.sh" && rm -rf /tmp/install.sh',
    );

    const securityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: `Security group for AWS Cloud9 environment for ${name}`
    });

    // https://ip-ranges.amazonaws.com/ip-ranges.json for Cloud9
    const resolveC9Cidrs = async () => {
      const res = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json');
      return await res.json() as {syncToken: string, createDate: string, prefixes: { 'ip_prefix': string, region: string, service: string, 'network_border_group': string }[]};
    };
    const c9cidrs = resolveC9Cidrs()
      .then(response => response.prefixes.filter(prefix => prefix.region === env?.region && prefix.service === 'CLOUD9')?.map(prefix => prefix.ip_prefix))
      .then(ciders => ciders.map(
        cidr => securityGroup.addIngressRule(
          Peer.ipv4(cidr),
          Port.tcp(22),
        )
      ));

    const instance = new cdk.aws_ec2.Instance(this, 'Cloud9Ec2Instance', {
      machineImage: MachineImage.genericLinux({
        [env!.region!]: amiId,
      }),
      vpc,
      vpcSubnets,
      instanceType: new InstanceType(instanceType),
      instanceName: name,
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          volume: BlockDeviceVolume.ebs(60, {
            volumeType: EbsDeviceVolumeType.GP3,
          }),
        }
      ],
      userData,
      securityGroup,
    });

    // attachment
    if (eni) {
      new ec2.CfnNetworkInterfaceAttachment(this, 'Attach', {
        instanceId: instance.instanceId,
        deviceIndex: '1',
        networkInterfaceId: eni.ref,
      });
    }

    instance.role.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, 'SessionManagerPolicy', 'arn:aws:iam::aws:policy/AmazonSSMManagedEC2InstanceDefaultPolicy'));
  }
}
