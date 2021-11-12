import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Stream } from 'stream';

interface Environments {
    bucketName: string,
    region: string,
    domain: string,
    pathPrefix: string,
}

const environments: Environments = {
  bucketName: process.env.BUCKET_NAME!,
  region: process.env.REGION!,
  domain: process.env.DOMAIN!,
  pathPrefix: process.env.PATH_PREFIX!,
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

const MIME_TYPES = {
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.ico': 'image/vnd.microsoft.icon',
};

const mimeType = (path: string | undefined, s3Mime: string): string => {
  const resolved = Object.entries(MIME_TYPES).find((entry) => (path?.endsWith(entry[0]) ? entry : undefined));

  // console.log(resolved ? resolved[1] : s3Mime);

  return resolved ? resolved[1] : s3Mime;
};

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  // console.log(JSON.stringify(event));

  const pathParameters = event.pathParameters || { proxy: undefined };
  const { proxy } = pathParameters;

  const s3 = new S3Client({});

  const content = proxy !== undefined && proxy !== '' ? await downloadObject(s3, proxy) : undefined;
  const notFound = await downloadObject(s3, 'index.html');

  return content !== undefined ? {
    statusCode: 200,
    headers: { 'Content-Type': mimeType(proxy, content?.contentType!) },
    body: content?.body,
  } : {
    statusCode: 404,
    headers: { 'Content-Type': notFound?.contentType! },
    body: notFound?.body,
  };
};

export default handler;
