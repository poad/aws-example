import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  // eslint-disable-next-line no-console
  console.log('request:', JSON.stringify(event, undefined, 2));

  const pathParameters = event.pathParameters || { proxy: undefined };
  const { proxy } = pathParameters;
  if (proxy === 'favicon.ico') {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/plain' },
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: 'Hello world!',
  };
};

export default handler;
