import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDB, ScanCommandInput } from '@aws-sdk/client-dynamodb';
import { URLSearchParams } from 'url';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Stream } from 'stream';
import { ErrorResponse } from '../types';

interface Environments {
    bucketName: string,
    region: string,
    table: string,
    domain: string,
    clientId: string,
    authorizeEndpoint: string,
    redirectUri: string,
    pathPrefix: string,
    responseType: string,
    identityProvider: string,
    scope: string,
}

const environments: Environments = {
  bucketName: process.env.BUCKET_NAME!,
  region: process.env.REGION!,
  table: process.env.TABLE_NAME!,
  domain: process.env.DOMAIN!,
  clientId: process.env.CLIENT_ID!,
  authorizeEndpoint: process.env.AUTHORIZE_ENDPOINT!,
  redirectUri: process.env.REDIRECT_URI!,
  pathPrefix: process.env.PATH_PREFIX!,
  responseType: process.env.RESPONSE_TYPE!,
  identityProvider: process.env.IDENTITY_PROVIDER!,
  scope: process.env.SCOPE!,
};

const downloadObject = async (s3: S3Client, path: string): Promise<{
    statusCode: number,
    contentType: string,
    body?: string
} | undefined> => {
  const key = `${environments.pathPrefix}/${path}`;

  // console.log(`s3 key: ${key}`);

  const resp = await s3.send(new GetObjectCommand({
    Bucket: environments.bucketName,
    Key: key,
  }));
  if (resp.Body === undefined) {
    // eslint-disable-next-line no-console
    console.warn('not found');

    return undefined;
  }
  const streamToString = (stream: Stream): Promise<string> => new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

  return {
    statusCode: 200,
    contentType: resp.ContentType!,
    body: await streamToString(resp.Body as Stream),
  };
};

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // console.log(JSON.stringify(event));

  const pathParameters = event.pathParameters || { proxy: undefined };
  const { proxy } = pathParameters;
  if (proxy === 'favicon.ico') {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/plain' },
    };
  }
  const s3 = new S3Client({});

  const body = event.body !== undefined ? Array.from(
    new URLSearchParams(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body),
  ).map((entry) => {
    const entity: { [key: string]: string } = {};
    const key = entry[0];
    entity[key] = entry[1];
    return entity;
  }).reduce((cur, acc) => Object.assign(acc, cur)) as {
        // eslint-disable-next-line camelcase
        user_code?: string,
    } : undefined;

  const userCode = body?.user_code;

  if (userCode === undefined) {
    const content = await downloadObject(s3, 'index.html');

    return {
      statusCode: 200,
      headers: { 'Content-Type': content!.contentType! },
      body: content!.body,
    };
  }

  const dynamoClient = new DynamoDB({
    region: environments.region,
  });

  const scan: ScanCommandInput = {
    TableName: environments.table,
    FilterExpression: 'user_code = :user_code',
    ExpressionAttributeValues: {
      ':user_code': { S: userCode },
    },
  };

  try {
    const result = await dynamoClient.scan(scan);
    const count = result.Count || 0;
    if (count === 0 || result.Items === undefined) {
      const content = await downloadObject(s3, 'error/index.html');

      return {
        statusCode: 200,
        headers: { 'Content-Type': content!.contentType! },
        body: content!.body,
      };
    }

    const responseType = environments.responseType;
    const idp = environments.identityProvider !== '' ? { identity_provider: environments.identityProvider } : {};

    const queryString = Object.entries({
      response_type: responseType,
      client_id: encodeURIComponent(environments.clientId),
      redirect_uri: encodeURIComponent(environments.redirectUri),
      state: encodeURIComponent(event.body!),
      scope: environments.scope,
      ...idp,
    } as {
            [key: string]: string
        })
      .map(([key, value]) => `${encodeURIComponent(key)}=${value}`)
      .reduce((cur, acc) => `${acc}&${cur}`);

    const authorizeURI = `${environments.authorizeEndpoint}?${queryString}`;

    // console.debug(`redirect to... ${authorizeURI}`);

    return {
      cookies: [],
      statusCode: 302,
      headers: { Location: authorizeURI },
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'server_error' } as ErrorResponse),
    };
  }
};

export default handler;
