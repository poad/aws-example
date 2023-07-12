import { SignatureV4 } from '@aws-sdk/signature-v4';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Sha256 } from '@aws-crypto/sha256-universal';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { STSClient } from '@aws-sdk/client-sts';
import { AwsCredentialIdentity, Provider, QueryParameterBag, HeaderBag } from '@aws-sdk/types';
import fetch from 'node-fetch';


interface EndpointParam {
  endpoint: URL,
  protocol: string,
  pathname: string,
  port?: number,
  method: string,
  host: string,
  hostname: string,
  path: string,
};

interface SignParams {
  endpoint: EndpointParam,
  query?: { [name: string]: string | string[] | undefined },
  optionalHeaders?: HeaderBag,
  body?: BodyInit | null | undefined,
  region: string | Provider<string>,
  service: string,
  credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>,
}

interface SignV4RequestParams {
  endpoint: URL,
  method?: string,
  query?: { [name: string]: string | string[] | undefined },
  optionalHeaders?: HeaderBag,
  body?: BodyInit | null | undefined,
  region?: string,
  service: string,
  credentials?: AwsCredentialIdentity | Provider<AwsCredentialIdentity>,
  fetchOption?: any
};

const sign = async ({ endpoint, query, optionalHeaders, body, region, service, credentials, }: SignParams) => {
  const signer = new SignatureV4({
    region,
    service,
    sha256: Sha256,
    credentials,
  });

  const options = {
    ...endpoint,
    query: query ? query as QueryParameterBag : undefined,
    headers: {
      ...optionalHeaders,
      host: endpoint.hostname,
    },
    body,
  };
  return signer.sign(
    new HttpRequest(options)
  );
};

const signRequest = (async (params: SignV4RequestParams) => {
  const sts = new STSClient({});
  const defaultRegion = sts.config.region;
  const port = params.endpoint.port && !Number.isNaN(params.endpoint.port) ? Number.parseInt(params.endpoint.port) : (params.endpoint.protocol === 'https:' ? 443 : (params.endpoint.protocol === 'http:' ? 80 : undefined));

  const req = await sign(
    {
      ...params,
      region: params.region ? params.region : defaultRegion,
      credentials: params.credentials ? params.credentials : defaultProvider(),
      endpoint: {
        ...params.endpoint,
        endpoint: params.endpoint,
        method: params.method || 'POST',
        path: params.endpoint.pathname,
        hostname: params.endpoint.host,
        port,
      },
    }
  );

  const { protocol, hostname, path, method, body, headers } = req;

  const queryString = params.query ? Object.entries(params.query)
    .map(entry => {
      if (Array.isArray(entry[1])) {
        return entry[1].map(value=> `${entry[0]}=${value}`).join('&');
      }
      return `${entry[0]}=${entry[1] || ''}`;
    }).join('&') : undefined;
  const res = await fetch(`${protocol}${hostname}${path}${queryString ? `?${queryString}` : ''}`, {
    method,
    headers,
    ...(body ? { body } : {})
  });
  return {
    request: req,
    response: res
  };
});


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
