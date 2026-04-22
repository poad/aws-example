#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();
new InfraStack(app, 'adoptopenjdk-jib-infra-stack', {
    ...app.node.tryGetContext('params')
});
