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
      'DEBIAN_FRONTEND=noninteractive apt install -qqqy --no-install-recommends git build-essential python2 nodejs zsh software-properties-common zip unzip zlib1g-dev libssl-dev libreadline-dev libbz2-dev libncurses-dev libffi-dev libsqlite3-dev liblzma-dev libevent-dev',
      'add-apt-repository ppa:git-core/ppa -y',
      'apt update -qqq && DEBIAN_FRONTEND=noninteractive apt full-upgrade -qqy',
      'CUR=$(pwd) && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip" && cd /tmp && unzip awscliv2.zip && ./aws/install && cd ${CUR} && rm -rf /tmp/awscliv2.zip rm -rf /tmp/aws',
      'wget -O- https://aka.ms/install-vscode-server/setup.sh | sh',
      `cat << EOS >> /usr/lib/systemd/system/code-server@.service
[Unit]
Description=code-server
After=network.target

[Service]
Type=exec
ExecStart=/usr/local/bin/code-server serve-local --accept-server-license-terms --host 0.0.0.0 --port 8080 --without-connection-token
#ExecStop=/usr/local/bin/code-server kill
#ExecStopPost=/usr/local/bin/code-server prune
Restart=always
User=%i

[Install]
WantedBy=default.target

EOS
      `,
      'systemctl daemon-reload',
      `cat << 'EOS' >> /home/ubuntu/.bashrc
# .bashrc

export PATH=$PATH:$HOME/.local/bin:$HOME/bin:/usr/local/bin

# load nvm
[ "$BASH_VERSION" ] && npm() {
    # hack: avoid slow npm sanity check in nvm
    if [ "$*" == "config get prefix" ]; then which node | sed "s/bin\/node//";
    else $(which npm) "$@"; fi
}


# modifications needed only in interactive mode
if [ "$PS1" != "" ]; then
    # Turn on checkwinsize
    shopt -s checkwinsize

    # keep more history
    shopt -s histappend
    export HISTSIZE=100000
    export HISTFILESIZE=100000
    export PROMPT_COMMAND="history -a;"

    # Source for Git PS1 function
    if [ -z "$(type -t __git_ps1)" ] && [ -e "/usr/share/git-core/contrib/completion/git-prompt.sh" ]; then
        . /usr/share/git-core/contrib/completion/git-prompt.sh
    fi

    # Cloud9 default prompt
    _cloud9_prompt_user() {
        if [ "$C9_USER" = root ]; then
            echo "$USER"
        else
            echo "$C9_USER"
        fi
    }

    PS1='\\[\\033[01;32m\\]$(_cloud9_prompt_user)\\[\\033[00m\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]$(__git_ps1 " (%s)" 2>/dev/null) $ '
fi
EOS
`,
      'chown ubuntu:ubuntu /home/ubuntu/.bashrc',
      `cat << 'EOS' >> /home/ubuntu/.profile
# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.

# the default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
#umask 022

# if running bash
if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
        . "$HOME/.bashrc"
    fi
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/.local/bin" ] ; then
    PATH="$HOME/.local/bin:$PATH"
fi
EOS
      `,
      'chown ubuntu:ubuntu /home/ubuntu/.profile',
      `cat << 'EOS' >> /home/ubuntu/.profile
# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.

# the default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
#umask 022

# if running bash
if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
        . "$HOME/.bashrc"
    fi
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/.local/bin" ] ; then
    PATH="$HOME/.local/bin:$PATH"
fi
EOS
      `,
      'chown ubuntu:ubuntu /home/ubuntu/.profile',
      `cat << 'EOS' >> /home/ubuntu/.bash_profile

[[ -s "$HOME/.profile" ]] && source "$HOME/.profile" # Load the default .profile

EOS`,
      'chown ubuntu:ubuntu /home/ubuntu/.bash_profile',
      'sudo -u ubuntu /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
      'mkdir -p /home/ubuntu/environment && chown -R ubuntu:ubuntu /home/ubuntu/environment',
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
