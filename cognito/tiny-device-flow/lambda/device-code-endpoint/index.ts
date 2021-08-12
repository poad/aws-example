import {
  APIGatewayProxyEventV2, APIGatewayProxyResultV2,
} from 'aws-lambda';
import randomBytes from 'randombytes';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { DynamoDB, PutItemInput } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { URLSearchParams } from 'url';
import { ErrorResponse, DeviceCodeTable } from '../types';

/* eslint-disable camelcase */
interface DeviceAuthorizationResponse {
    device_code: string,
    user_code: string,
    verification_uri: string,
    verification_uri_complete?: string,
    expires_in: number,
    interval?: number,
    message?: string,
}
/* eslint-enable camelcase */

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<DeviceAuthorizationResponse | ErrorResponse>> => {
  // console.log(JSON.stringify(event));

  const body = event.body !== undefined ? Array.from(
    new URLSearchParams(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body),
  ).map((entry) => {
    const entity: { [key: string]: string } = {};
    entity[entry[0]] = entry[1];
    return entity;
  }).reduce((cur, acc) => Object.assign(acc, cur)) as {
    /* eslint-disable camelcase */
    client_id?: string,
    scope?: string,
    /* eslint-enable camelcase */
  } : undefined;
  if (body === undefined || body.client_id === undefined) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'invalid_request',
        error_description: "The request body must contain the following parameter: 'client_id'.",
      } as ErrorResponse),
    };
  }

  if (body.client_id !== process.env.CLIENT_ID) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'unauthorized_client',
        error_description: 'Unauthorized or unknown client',
      } as ErrorResponse),
    };
  }

  const rawUserCode = randomBytes(4).toString('hex').toUpperCase();
  const userCode = `${rawUserCode.substr(0, 4)}-${rawUserCode.substr(4)}`;

  const uuid = uuidv4();
  const deviceCode = crypto.createHash('sha512').update(uuid).digest('hex');

  const dynamoClient = new DynamoDB({
    region: process.env.REGION!,
  });

  const duration = Number(process.env.EXPIRE_IN_SEC || '300');

  const item: PutItemInput = {
    Item: marshall({
      device_code: deviceCode,
      user_code: userCode,
      expire: Math.floor((new Date().getTime() / 1000) + duration),
    } as DeviceCodeTable),
    TableName: process.env.TABLE_NAME,
  };

  try {
    await dynamoClient.putItem(item);

    return {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: process.env.VERIFICATION_URI!,
      expires_in: duration,
    } as DeviceAuthorizationResponse;
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
