import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// サーバーインスタンスの作成
export const server = new McpServer({
  name: "MathTools",
  version: "0.1.0",
});

server.tool(
  "calculate",
  { a: z.number(), b: z.number(), operation: z.enum(["add", "subtract", "multiply", "divide"]) },
  async ({ a, b, operation }) => {
    let result;
    switch (operation) {
      case "add": result = a + b; break;
      case "subtract": result = a - b; break;
      case "multiply": result = a * b; break;
      case "divide": result = a / b; break;
    }
    return {
      content: [{ type: "text", text: `結果: ${result}` }]
    };
  }
);

// 因数分解ツールの実装
server.tool(
  "factorize",
  "Factorize a number into its prime factors",
  { number: z.number().int().positive().describe("An integer to factorize") },
  async ({ number }) => {
    const factors = findPrimeFactors(number);

    return {
      content: [
        {
          type: "text",
          text: `Prime factors of ${number}: ${factors.join(' × ')}`,
        },
      ],
    };
  }
);

// 最大公約数を計算するツール
server.tool(
  "gcd",
  "Calculate the greatest common divisor of two numbers",
  {
    a: z.number().int().describe("First integer"),
    b: z.number().int().describe("Second integer")
  },
  async ({ a, b }) => {
    const result = calculateGCD(a, b);

    return {
      content: [
        {
          type: "text",
          text: `The greatest common divisor of ${a} and ${b} is ${result}`,
        },
      ],
    };
  }
);

// 素数判定ツール
server.tool(
  "isPrime",
  "Check if a number is prime",
  { number: z.number().int().positive().describe("Number to check") },
  async ({ number }) => {
    const prime = isPrime(number);

    return {
      content: [
        {
          type: "text",
          text: prime ?
            `${number} is a prime number.` :
            `${number} is not a prime number.`,
        },
      ],
    };
  }
);

// 素数判定関数
function isPrime(num: number): boolean {
  if (num <= 1) return false;
  if (num <= 3) return true;

  if (num % 2 === 0 || num % 3 === 0) return false;

  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }

  return true;
}

// 因数分解関数
function findPrimeFactors(n: number): number[] {
  const factors: number[] = [];
  let divisor = 2;

  while (n > 1) {
    while (n % divisor === 0) {
      factors.push(divisor);
      n /= divisor;
    }
    divisor++;

    if (divisor * divisor > n && n > 1) {
      factors.push(n);
      break;
    }
  }

  return factors;
}

// 最大公約数計算関数
function calculateGCD(a: number, b: number): number {
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return Math.abs(a);
}
