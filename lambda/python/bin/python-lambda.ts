#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { PythonLambdaStack } from '../lib/python-lambda-stack';

const app = new cdk.App();
new PythonLambdaStack(app, 'PythonLambdaExampleStack', {
    tag: app.node.tryGetContext('tag')
});
