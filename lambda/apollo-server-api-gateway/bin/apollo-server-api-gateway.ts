#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApolloServerApiGatewayStack } from '../lib/apollo-server-api-gateway-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('env') as string;

// eslint-disable-next-line no-new
new ApolloServerApiGatewayStack(app, 'ApolloServerApiGatewayStack', {
  environment,
});
