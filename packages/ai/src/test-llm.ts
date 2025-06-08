import dotenv from "dotenv";
import * as path from "path";

// Load .env from the package root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { defaultLLMConfig } from "./config/llm.config";
import { ProviderFactory, ProviderType } from "./providers/provider.factory";

interface TestCase {
  name: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

const TEST_CASES: TestCase[] = [
  {
    name: "Factual Knowledge",
    messages: [
      { role: "user", content: "Who won the football World Cup in 2014?" },
    ],
    temperature: 0.7,
    maxTokens: 100,
  },
  {
    name: "Reasoning Test",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that explains concepts in simple terms.",
      },
      { role: "user", content: "Explain quantum computing in simple terms" },
    ],
    temperature: 0.5,
    maxTokens: 200,
  },
];

async function runTest(testCase: TestCase, providerType: ProviderType) {
  try {
    const startTime = Date.now();

    console.log(`\n=== Running Test: ${testCase.name} ===`);
    console.log(`Provider: ${providerType}`);
    console.log(`Model: ${defaultLLMConfig.defaultProvider.model}`);
    console.log(
      "Prompt:",
      testCase.messages.map((m) => `${m.role}: ${m.content}`).join("\n")
    );

    // Create provider with OpenRouter config
    const providerConfig = {
      ...defaultLLMConfig.defaultProvider,
      provider: providerType,
      model: process.env.DEEPSEEK_MODEL || "deepseek/deepseek-r1-0528:free",
      apiKey: process.env.OPENROUTER_API_KEY || "",
      // Additional OpenRouter-specific config
      openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
      siteUrl: process.env.SITE_URL || "http://localhost:3000",
      siteName: process.env.SITE_NAME || "Local Development",
    } as const;

    const provider = ProviderFactory.createProvider(providerConfig);

    const response = await provider.generateCompletion(
      testCase.messages.map((m) => m.content).join("\n"),
      {
        temperature: testCase.temperature,
        maxTokens: testCase.maxTokens,
      }
    );

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log("\nResponse:");
    console.log(response.content);
    console.log("\nMetrics:");
    console.log(`- Duration: ${duration.toFixed(2)}s`);
    console.log("- Token Usage:", response.tokensUsed);
    console.log("- Cost:", response.cost);

    return { success: true, duration };
  } catch (error) {
    interface ErrorWithResponse extends Error {
      response?: {
        data?: unknown;
      };
      code?: string | number;
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("\n❌ Test failed:", errorMessage);

    // Type guard to check if error is an object with response property
    if (error && typeof error === "object") {
      const typedError = error as ErrorWithResponse;

      if (typedError.response?.data !== undefined) {
        console.error("Error details:", typedError.response.data);
      } else if (typedError.code !== undefined) {
        console.error("Error code:", typedError.code);
      }
    }

    return { success: false, error: errorMessage };
  }
}

async function testLLM() {
  console.log("🚀 Starting LLM Provider Test Suite\n");

  const providerType = defaultLLMConfig.defaultProvider
    .provider as ProviderType;

  for (const [index, testCase] of TEST_CASES.entries()) {
    console.log(`\n🔹 Test Case ${index + 1}/${TEST_CASES.length}`);
    await runTest(testCase, providerType);
  }

  console.log("\n✅ Test suite completed");
}

// Run the test suite
testLLM().catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});
