#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AgentcoreRuntimeAgentExampleStack } from '../lib/agentcore-runtime-agent-example-stack.js';

const app = new cdk.App();
const stack = new AgentcoreRuntimeAgentExampleStack(app, 'AgentcoreRuntimeAgentExample', {});

cdk.RemovalPolicies.of(stack).apply(cdk.RemovalPolicy.DESTROY);
