#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ApolloServerStack } from '../lib/apollo-server-stack.js';

const app = new cdk.App();

new ApolloServerStack(app, 'ApolloServer', {});
