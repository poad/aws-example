import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Peer, Port, SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, CpuArchitecture, FargateTaskDefinition, LogDriver, OperatingSystemFamily, Protocol, RepositoryImage } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { AlbScheme } from 'aws-cdk-lib/aws-eks';
import { ApplicationListener, ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup, ListenerAction, TargetType } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface EcsStackProps extends StackProps {
  clusterName: string,
  albName: string,
  albSecurityGroupName: string,
  albScheme: AlbScheme,
  port: number,
  containerPort: number,
  protocol: ApplicationProtocol,
  albTargetGroupName: string,
  ecsLogGroupName: string,
  ecsTaskFamily: string,
  ecsImageName: string,
  ecsTaskExecutionRoleName: string,
  ecsTaskRoleName: string,
  ecsTaskCPUUnit: 256 | 512 | 1024 | 2048 | 4096,
  ecsTaskMemory: 512 | 1024 | 2048 | 4096,
  ecsServiceSecurityGroupName: string,
  vpcId: string,
  ecsTaskDesiredCount: number,
  containerName: string,
  ecsServiceName: string,
  subnets: string[],
}

export class EcsStack extends Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const { clusterName, albSecurityGroupName, albName, containerPort, vpcId, albScheme, subnets, port, protocol,
      albTargetGroupName, ecsLogGroupName, ecsTaskCPUUnit: cpu, ecsTaskMemory: memoryLimitMiB,
      containerName, ecsServiceName, ecsTaskFamily, ecsTaskDesiredCount, ecsTaskExecutionRoleName, ecsTaskRoleName,
      ecsServiceSecurityGroupName } = props;

    const vpc = Vpc.fromLookup(this, 'VPC', { vpcId });
    const albSg = new SecurityGroup(this, 'AlbSecurityGroup', {
      securityGroupName: albSecurityGroupName,
      description: 'Security Group for ALB',
      vpc,
    });
    albSg.addIngressRule(Peer.anyIpv4(), Port.tcp(containerPort));

    const vpcSubnets = subnets.length > 0 ? {
      subnets: subnets.map((subnetId, index) =>
        Subnet.fromSubnetId(this, `Subnet-${index}`, subnetId)
      )
    } : undefined;

    const alb = new ApplicationLoadBalancer(this, 'Alb', {
      loadBalancerName: albName,
      internetFacing: albScheme === AlbScheme.INTERNET_FACING,
      securityGroup: albSg,
      http2Enabled: true,
      vpc,
      vpcSubnets,
    });

    const targetGroup = new ApplicationTargetGroup(this, 'AlbTargetGroup', {
      targetGroupName: albTargetGroupName,
      port,
      protocol,
      targetType: TargetType.IP,
      vpc
    });
    targetGroup.node.addDependency(alb);

    // const listener = new ApplicationListener(this, 'AlbListener', {
    //   loadBalancer: alb,
    //   port,
    //   protocol,
    //   defaultAction: ListenerAction.forward([targetGroup])
    // });
    // listener.node.addDependency(alb, targetGroup);

    const ecsLogs = new LogGroup(this, 'ECSLogGroup', {
      logGroupName: `/ecs/logs/${ecsLogGroupName}`,
      retention: RetentionDays.THREE_DAYS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const taskDef = new FargateTaskDefinition(this, 'ECSContainerDefinition', {
      cpu: cpu,
      memoryLimitMiB,
      executionRole: new Role(this, 'ECSTaskExecutionRole', {
        roleName: ecsTaskExecutionRoleName,
        assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
        inlinePolicies: {
          'log-access-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutDestination',
                  'logs:PutDestinationPolicy',
                  'logs:DescribeLogGroups',
                  'logs:DescribeLogStreams',
                  'logs:DescribeMetricFilters',
                  'logs:DescribeSubscriptionFilters',
                  'logs:PutLogEvents',
                  'logs:GetLogEvents',
                ],
                effect: Effect.ALLOW,
                resources: ['*']
              })
            ]
          }),
        },
      }),
      taskRole: new Role(this, 'ECSTaskRole', {
        roleName: ecsTaskRoleName,
        assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
        inlinePolicies: {
          'log-access-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                actions: [
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                effect: Effect.ALLOW,
                resources: ['*']
              })
            ]
          }),
          'ecs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                actions: [
                  'ecs:*',
                  'ecr:*',
                ],
                effect: Effect.ALLOW,
                resources: ['*']
              })
            ]
          })

        },
      }),
      family: ecsTaskFamily,
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.X86_64,
        operatingSystemFamily: OperatingSystemFamily.LINUX,
      },
    });

    taskDef.addContainer('ECSContainerDefinition', {
      cpu,
      memoryLimitMiB,
      image: RepositoryImage.fromRegistry(containerName),
      portMappings: [
        {
          containerPort,
          hostPort: containerPort,
          protocol: Protocol.TCP
        }
      ],
      logging: LogDriver.awsLogs({
        logGroup: ecsLogs,
        streamPrefix: ecsServiceName,
      }),
    });

    const serviceSecurityGroup = new SecurityGroup(this, 'ECSServiceSecurityGroup', {
      securityGroupName: ecsServiceSecurityGroupName,
      description: 'Security Group for ECS Service',
      vpc,
    });
    serviceSecurityGroup.addIngressRule(Peer.securityGroupId(albSg.securityGroupId), Port.tcp(containerPort));

    new ApplicationLoadBalancedFargateService(this, 'ECSService', {
      cluster: new Cluster(this, 'ECSCluster', { clusterName }),
      loadBalancer: alb,
      listenerPort: port,
      taskDefinition: taskDef,
      securityGroups: [serviceSecurityGroup],
      desiredCount: ecsTaskDesiredCount,
      assignPublicIp: false,
      taskSubnets: vpcSubnets,
    });
  }
}
