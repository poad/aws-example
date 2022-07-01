import { SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import { GitHubSourceCodeProvider } from '@aws-cdk/aws-amplify-alpha';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

interface AmplifyCdkStackProps extends StackProps {
  accessToken: string,
}

export class AmplifyCdkStack extends Stack {
  constructor(scope: Construct, id: string, props: AmplifyCdkStackProps) {
    super(scope, id, props);

    const { accessToken } = props;

    const app = new amplify.App(this, 'AmplifyApp', {
      appName: 'amplify-cdk',
      sourceCodeProvider: new GitHubSourceCodeProvider({
        owner: 'poad',
        repository: 'aws-example',
        oauthToken: SecretValue.unsafePlainText(accessToken)
      }),
      autoBranchDeletion: true,
      environmentVariables: {
        AMPLIFY_MONOREPO_APP_ROOT: 'amplify/amplify-cdk/app',
        _LIVE_UPDATES: '[{"name":"Node.js version","pkg":"node","type":"nvm","version":"16"},{"name":"Next.js version","pkg":"next-version","type":"internal","version":"latest"},{"name":"Yarn","pkg":"yarn","type":"npm","version":"latest"}]'
      },
      role: new Role(this, 'AmplifyAppServiceRole', {
        roleName: 'AmplifyAppServiceRole',
        assumedBy: new ServicePrincipal('amplify.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify')
        ]
      })
    });
    new amplify.Branch(this, 'AmplifyBranch', {
      app,
      branchName: 'main',
      autoBuild: false
    });
  }
}
