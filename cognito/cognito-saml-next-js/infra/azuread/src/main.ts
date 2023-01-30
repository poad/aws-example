import { Construct } from "constructs";
import { App, CloudBackend, TerraformStack, NamedCloudWorkspace } from "cdktf";
import { AzureadProvider } from '@cdktf/provider-azuread/lib/provider';
import { Application } from '@cdktf/provider-azuread/lib/application';

interface MyStackProps {
  redirectUris: string[];
  logoutUrl: string;
}

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id);

    const {
      redirectUris,
      logoutUrl
    } = props;

    new CloudBackend(this, {
      hostname: "app.terraform.io",
      organization: "poad",
      workspaces: new NamedCloudWorkspace("azure-ad"),
    });

    new AzureadProvider(this, "azureFeature", {
    });

    new Application(this, 'Application', {
      displayName: 'test',
      signInAudience: 'AzureADMyOrg',
      web: {
        redirectUris: redirectUris,
        logoutUrl: logoutUrl,
      },
    });
  }
}

const app = new App();

const redirectUris = app.node.tryGetContext('redirectUris') || [];
const logoutUrl = app.node.tryGetContext('logoutUrl');

new MyStack(app, "AzureAD", {
  redirectUris,
  logoutUrl,
});
app.synth();
