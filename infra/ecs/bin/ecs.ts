#!/usr/bin/env node
import { EcsStack } from '../lib/ecs-stack.js';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
new EcsStack(app, 'Ecs', {
  ...app.node.tryGetContext('param'),
});
