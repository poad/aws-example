#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AcmStack } from '../lib/acm-stack';
import * as assert from 'assert';

const app = new cdk.App();

new AcmStack(app, 'acm-stack', {
});
