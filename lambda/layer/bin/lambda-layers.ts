#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaLayersStack } from '../lib/lambda-layers-stack';
import { compileBundles } from '../lib/process/setup';


compileBundles();
const app = new cdk.App();
new LambdaLayersStack(app, 'LambdaLayersStack');
