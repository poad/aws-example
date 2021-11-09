import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDB, QueryCommandInput } from '@aws-sdk/client-dynamodb';
import { URLSearchParams } from 'url';
import { ErrorResponse } from '../types';

/* eslint-disable camelcase */
interface DeviceAccessTokenResponse {
    id_token: string,
    access_token: string,
    token_type: string,
    expires_in?: number,
}
/* eslint-enable camelcase */

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<DeviceAccessTokenResponse | ErrorResponse>> => {
  // console.log(JSON.stringify(event));

  const body = event.body !== undefined ? Array.from(
    new URLSearchParams(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body),
  ).map((entry) => {
    const entity: { [key: string]: string } = {};
    entity[entry[0]] = entry[1];
    return entity;
  }).reduce((cur, acc) => Object.assign(acc, cur)) as {
    /* eslint-disable camelcase */
    grant_type?: string,
    device_code?: string,
    client_id?: string,
    /* eslint-enable camelcase */
} : undefined;
  /* eslint-disable camelcase */
  const { grant_type, device_code, client_id } = body || {};
  if (grant_type === undefined || device_code === undefined
    || client_id === undefined || device_code.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'invalid_request',
        error_description: "The request body must contain the following parameter: 'client_id'.",
      } as ErrorResponse),
    };
  }
  /* eslint-enable camelcase */

  // eslint-disable-next-line camelcase
  if (grant_type !== 'urn:ietf:params:oauth:grant-type:device_code') {
    return {
      statusCode: 400,
      body: JSON.stringify({
        /* eslint-disable camelcase */
        error: 'unsupported_grant_type',
        error_description: 'The app requested an unsupported grant type',
        /* eslint-enable camelcase */
      } as ErrorResponse),
    };
  }

  // eslint-disable-next-line camelcase
  if (client_id !== process.env.CLIENT_ID!) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        /* eslint-disable camelcase */
        error: 'unauthorized_client',
        error_description: 'Unauthorized or unknown client',
        /* eslint-enable camelcase */
      } as ErrorResponse),
    };
  }

  const dynamoClient = new DynamoDB({
    region: process.env.REGION!,
  });

  const query: QueryCommandInput = {
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'device_code = :device_code',
    ExpressionAttributeValues: {
      /* eslint-disable camelcase */
      ':device_code': { S: device_code },
      /* eslint-enable camelcase */
    },
  };

  try {
    const result = await dynamoClient.query(query);
    const count = result.Count || 0;
    if (count === 0 || result.Items === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          /* eslint-disable camelcase */
          error: 'invalid_grant',
          error_description: 'Invalid or expired device code.',
          /* eslint-enable camelcase */
        } as ErrorResponse),
      };
    }

    const item = result.Items[0];
    // eslint-disable-next-line camelcase
    if (item.access_token === undefined || item.token_type === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          /* eslint-disable camelcase */
          error: 'authorization_pending',
          error_description: 'OAuth 2.0 device flow error. Authorization is pending. Continue polling.',
          /* eslint-enable camelcase */
        } as ErrorResponse),
      };
    }

    return {
      /* eslint-disable camelcase */
      id_token: item.id_token.S!,
      access_token: item.access_token.S!,
      token_type: item.token_type.S!,
      expires_in: item.token_expire.N !== undefined ? Number(item.token_expire.N) : undefined,
      /* eslint-enable camelcase */
    } as DeviceAccessTokenResponse;
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
