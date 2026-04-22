#!/usr/bin/env node
import { ApolloServerStack } from '../lib/apollo-server-stack.js';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();

new ApolloServerStack(app, 'apollo-server-stack', {
});
