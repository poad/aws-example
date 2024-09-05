import { signRequest } from './sign-v4-request'

const service = 'sts';
const region = 'us-west-2';

const endpoint = new URL(`https://${service}.${region}.amazonaws.com/`);

signRequest({
  method: 'GET',
  service,
  endpoint,
  query: {
    'Action': 'GetCallerIdentity',
    'Version': '2011-06-15',
  },
  // credentials: defaultProvider({
  //   roleAssumer: async (credentials) => {
  //     const sts = new STSClient({ credentials })
  //     const response = await sts.send(new AssumeRoleCommand({
  //       RoleArn: `arn:aws:iam::${awsUserId}:role/${roleName}`,
  //       RoleSessionName: 'test'
  //     }))
  //     return {
  //       accessKeyId: response.Credentials!.AccessKeyId!,
  //       secretAccessKey: response.Credentials!.SecretAccessKey!,
  //       sessionToken: response.Credentials!.SessionToken,
  //       expiration: response.Credentials!.Expiration,
  //     }
  //   },
  // }),
}).then(async ({ request: req, response: res }) => {
  console.log(JSON.stringify(req.headers));
  console.log(`${res.status} ${res.statusText}`);
  console.log(await res.text());
});
