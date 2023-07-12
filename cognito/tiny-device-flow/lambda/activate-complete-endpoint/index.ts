import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDB, ScanCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { URLSearchParams } from 'url';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Stream } from 'stream';
import fetch from 'node-fetch';
import { DeviceCodeTable, ErrorResponse } from '../types';

interface Environments {
    bucketName: string,
    region: string,
    table: string,
    domain: string,
    clientId: string,
    redirectUri: string,
    retryUri: string,
    pathPrefix: string,
    responseType: string,
}

const environments: Environments = {
  bucketName: process.env.BUCKET_NAME!,
  region: process.env.REGION!,
  table: process.env.TABLE_NAME!,
  domain: process.env.DOMAIN!,
  clientId: process.env.CLIENT_ID!,
  redirectUri: process.env.REDIRECT_URI!,
  retryUri: process.env.RETRY_URI!,
  pathPrefix: process.env.PATH_PREFIX!,
  responseType: process.env.RESPONSE_TYPE!,
};

const authorize = async (param: {
    domain: string,
    clientId: string,
    redirectUri: string,
    code: string,
}): Promise<{
    idToken: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    tokenType: string,
}> => {
  const body = Object.entries({
    grant_type: 'authorization_code',
    client_id: encodeURIComponent(param.clientId),
    redirect_uri: encodeURIComponent(param.redirectUri),
    code: encodeURIComponent(param.code),
  } as {
        [key: string]: string
    })
    .map(([key, value]) => `${encodeURIComponent(key)}=${value}`)
    .reduce((cur, acc) => `${acc}&${cur}`);

  const authUri = `https://${param.domain}.auth.us-west-2.amazoncognito.com/oauth2/token`;

  const resp = await fetch(authUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow',
    body,
  });

  /* eslint-disable camelcase */
  const json = await resp.json() as {
    access_token: string,
    refresh_token: string,
    id_token: string,
    token_type: string,
    expires_in: number
  };
  /* eslint-enable camelcase */

  /* eslint-disable camelcase */
  return {
    idToken: json.id_token,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    tokenType: json.token_type,
  };
  /* eslint-enable camelcase */
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

  const state = event.queryStringParameters?.state ? Array.from(
    new URLSearchParams(
      Buffer.from(event.queryStringParameters?.state, 'base64').toString(),
    ),
  ).map((entry) => {
    const entity: { [key: string]: string } = {};
    const key = entry[0];
    entity[key] = entry[1];
    return entity;
  }).reduce((cur, acc) => Object.assign(acc, cur)) as {
        // eslint-disable-next-line camelcase
        user_code?: string,
    } : undefined;

  const code = event.queryStringParameters?.code;
  const idToken = event.queryStringParameters?.id_token;
  const accessToken = event.queryStringParameters?.access_token;
  const expiresIn = event.queryStringParameters?.expires_in;
  if (
    (environments.responseType === 'code' && code === undefined)
    || (environments.responseType === 'token' && (idToken === undefined || accessToken === undefined || expiresIn === undefined))
    || state === undefined || state?.user_code === undefined) {
    // eslint-disable-next-line no-console
    console.warn('code or state, user_code are not found');
    // console.debug(`code: ${code} state: ${event.queryStringParameters?.state} user_code: ${state?.user_code}`);
    return {
      cookies: [],
      statusCode: 302,
      headers: { Location: environments.retryUri },
    };
  }

  const userCode = state.user_code!;

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

    const token = environments.responseType === 'code' && code
      ? await authorize({
        domain: environments.domain,
        clientId: environments.clientId,
        redirectUri: environments.redirectUri,
        code,
      }) : {
        idToken,
        accessToken,
        expiresIn: Number(expiresIn || '0'),
      };

    // eslint-disable-next-line camelcase
    const { device_code, expire } = result.Items[0];

    /* eslint-disable camelcase */
    const item: DeviceCodeTable = {
      device_code: device_code.S!,
      user_code: userCode,
      token_type: 'Bearer',
      id_token: token.idToken,
      access_token: token.accessToken,
      token_expire: token.expiresIn,
      expire: Number(expire.N!),
    };
    /* eslint-enable camelcase */

    await dynamoClient.putItem({
      Item: marshall(item),
      TableName: environments.table,
    });

    const content = await downloadObject(s3, 'complete/index.html');

    return {
      statusCode: 200,
      headers: { 'Content-Type': content!.contentType! },
      body: content!.body,
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
