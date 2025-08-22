import { ApolloServer } from '@apollo/server';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  APIGatewayProxyResultV2,
  Context,
} from 'aws-lambda';

const typeDefs = `#graphql
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello, World!',
  },
};

// Apollo Server v5の推奨設定
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // 本番環境では introspection を無効にする
  introspection: process.env.NODE_ENV !== 'production',
  // セキュリティ向上のため、本番環境では詳細なエラー情報を無効にする
  includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
});

// GraphQLリクエストを解析する関数
function parseGraphQLRequest(event: APIGatewayProxyEvent | APIGatewayProxyEventV2) {
  const { body, queryStringParameters } = event;
  const httpMethod = Object.keys(event).includes('httpMethod') ? (event as APIGatewayProxyEvent).httpMethod : (event as APIGatewayProxyEventV2).requestContext.http.method;

  if (httpMethod === 'POST' && body) {
    try {
      return JSON.parse(body);
    } catch {
      return { query: body };
    }
  }

  if (httpMethod === 'GET' && queryStringParameters?.query) {
    return {
      query: queryStringParameters.query,
      variables: queryStringParameters.variables
        ? JSON.parse(queryStringParameters.variables)
        : undefined,
      operationName: queryStringParameters.operationName,
    };
  }

  return null;
}

// Apollo Server v5用のLambda統合
export async function handler(
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResult | APIGatewayProxyResultV2> {
  const httpMethod = Object.keys(event).includes('httpMethod') ? (event as APIGatewayProxyEvent).httpMethod : (event as APIGatewayProxyEventV2).requestContext.http.method;
  // CORS preflight リクエストの処理
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const graphqlRequest = parseGraphQLRequest(event);

    if (!graphqlRequest) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          errors: [{ message: 'Invalid GraphQL request' }],
        }),
      };
    }

    // GraphQLリクエストを処理
    const response = await server.executeOperation(graphqlRequest, {
      contextValue: {
        // Lambda context を GraphQL context に追加
        lambdaContext: context,
        // リクエスト情報を追加
        requestId: context.awsRequestId,
        event,
      },
    });

    // レスポンスを返す
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('GraphQL execution error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        errors: [{ message: 'Internal server error' }],
      }),
    };
  }
}

export default handler;
