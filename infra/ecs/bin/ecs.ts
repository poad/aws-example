#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EcsStack } from '../lib/ecs-stack.js';

const app = new cdk.App();
new EcsStack(app, 'EcsStack', {
  ...app.node.tryGetContext('param')
});
