#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApolloServerStack } from '../lib/apollo-server-stack';

const app = new cdk.App();
new ApolloServerStack(app, 'apollo-server-stack', {
});