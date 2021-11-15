#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CognitoAwsConsoleInfraStack, GroupConfig } from '../lib/cognito-aws-console-infra-stack';

const app = new cdk.App();

const region = app.node.tryGetContext("region") as string;
const env = app.node.tryGetContext("env") as string;
const groups = app.node.tryGetContext("groups") as GroupConfig[];

new CognitoAwsConsoleInfraStack(app, `${env}-cognito-aws-console-infra-stack`, {
    groups,
    environment: env,
    env: {
        region
    }
});
