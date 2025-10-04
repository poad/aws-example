#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AgentCoreRuntimeStack } from '../lib/agent-core-runtime-stack.js';

const app = new cdk.App();
const stack = new AgentCoreRuntimeStack(app, 'agent-core-runtime-example', {
});

cdk.RemovalPolicies.of(stack).apply(cdk.RemovalPolicy.DESTROY);
