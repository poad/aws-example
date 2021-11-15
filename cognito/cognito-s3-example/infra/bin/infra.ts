#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { InfraStack, GroupConfig } from '../lib/infra-stack';


const app = new cdk.App();

const region = app.node.tryGetContext("region") as string;
const userPoolId = app.node.tryGetContext("userPoolId") as string;
const idPoolId = app.node.tryGetContext("idPoolId") as string;
const bucket = app.node.tryGetContext("bucket") as string;
const groups = app.node.tryGetContext("groups") as GroupConfig[];

new InfraStack(app, 'CognitoS3InfraStack', {
    userPoolId: userPoolId,
    idPoolId: idPoolId,
    bucket: bucket,
    groups: groups,
    env: {
        region: region
    }
});
