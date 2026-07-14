import OpenAI from 'openai';
import { getTokenProvider } from '@aws/bedrock-token-generator';
import { config } from '@dotenvx/dotenvx';

config();

const provideToken = getTokenProvider();

const client = new OpenAI({
  apiKey: await provideToken(),
  baseURL: 'https://bedrock-mantle.us-east-1.api.aws/v1',
  project: 'default',
});

const response = await client.responses.create({
  model: 'openai.gpt-oss-20b',
  // model: "openai.gpt-5.4",
  input: [{ role: 'user', content: 'What is Amazon Bedrock?' }],
});
console.log(response.output_text);
