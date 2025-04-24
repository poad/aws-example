import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import dotenv from 'dotenv';

dotenv.config();

const serverUrl = process.env.MCP_SERVER_URL || "http://localhost:8080";

const transport = new StreamableHTTPClientTransport(new URL(serverUrl + "/mcp"));

const client = new Client(
    {
        name: "example-client",
        version: "1.0.0"
    }
);

async function main(): Promise<void> {
    await client.connect(transport);

    // 利用可能なツールのリストを取得
    const tools = await client.listTools();
    console.log("利用可能なツール:", JSON.stringify(tools, null, 2));

    // calculate ツールを呼び出す
    const toolResult = await client.callTool({
      "name": "calculate",
      "arguments": { "a": 1, "b": 2, "operation": "add" }
    });
    console.log("計算結果:", toolResult.content);
}

main().catch((error: unknown) => {
    console.error('MCP クライアント実行中のエラー:', error);
    process.exit(1);
});
