#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcsStack } from '../lib/ecs-stack';

const app = new cdk.App();
new EcsStack(app, 'EcsStack', {
  ...app.node.tryGetContext('param')
});