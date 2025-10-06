#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AgentcoreRuntimeMcpExampleStack } from '../lib/agentcore-runtime-mcp-example-stack.js';

const app = new cdk.App();
const stack = new AgentcoreRuntimeMcpExampleStack(app, 'agentcore-runtime-mcp-example-stack', {
});
cdk.RemovalPolicies.of(stack).apply(cdk.RemovalPolicy.DESTROY);
