#!/usr/bin/env node
import { AgentcoreRuntimeMcpExampleStack } from '../lib/agentcore-runtime-mcp-example-stack.js';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
const stack = new AgentcoreRuntimeMcpExampleStack(app, 'AgentcoreRuntimeMcpExample', {
});
cdk.RemovalPolicies.of(stack).apply(cdk.RemovalPolicy.DESTROY);
