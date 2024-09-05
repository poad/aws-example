import { SignatureV4 } from '@smithy/signature-v4';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { Sha256 } from '@aws-crypto/sha256-universal';
import { HttpRequest } from '@smithy/protocol-http';
import { STSClient } from '@aws-sdk/client-sts';
import { AwsCredentialIdentity, Provider, QueryParameterBag, HeaderBag } from '@aws-sdk/types';

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
  query?: Record<string, string | string[] | undefined>,
  optionalHeaders?: HeaderBag,
  body?: BodyInit | null | undefined,
  region: string | Provider<string>,
  service: string,
  credentials: AwsCredentialIdentity | Provider<AwsCredentialIdentity>,
}

interface SignV4RequestParams {
  endpoint: URL,
  method?: string,
  query?: Record<string, string | string[] | undefined>,
  queryString?: string,
  optionalHeaders?: HeaderBag,
  body?: BodyInit | null | undefined,
  region?: string,
  service: string,
  credentials?: AwsCredentialIdentity | Provider<AwsCredentialIdentity>,
  fetchOption?: unknown
};

async function sign({ endpoint, query, optionalHeaders, body, region, service, credentials, }: SignParams) {
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

async function signRequest(params: SignV4RequestParams) {
  const sts = new STSClient({});
  const defaultRegion = sts.config.region;
  const port = params.endpoint.port && !Number.isNaN(params.endpoint.port) ? Number.parseInt(params.endpoint.port) : (params.endpoint.protocol === 'https:' ? 443 : (params.endpoint.protocol === 'http:' ? 80 : undefined));

  const req = await sign(
    {
      ...params,
      region: params.region ? params.region : defaultRegion,
      credentials: params.credentials ? params.credentials : fromNodeProviderChain({
        clientConfig: { region: params.region ? params.region : defaultRegion },
      }),
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
};

export {
  signRequest,
}
