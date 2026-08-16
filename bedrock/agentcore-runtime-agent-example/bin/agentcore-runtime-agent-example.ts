#!/usr/bin/env node
import { AgentcoreRuntimeAgentExampleStack } from '../lib/agentcore-runtime-agent-example-stack.js';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
const stack = new AgentcoreRuntimeAgentExampleStack(app, 'AgentcoreRuntimeAgentExample', {
});

cdk.RemovalPolicies.of(stack).apply(cdk.RemovalPolicy.DESTROY);
