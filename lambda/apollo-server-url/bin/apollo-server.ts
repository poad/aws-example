#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApolloServerStack } from '../lib/apollo-server-stack';

const app = new cdk.App();
// eslint-disable-next-line no-new
new ApolloServerStack(app, 'ApolloServerStack', {
});
