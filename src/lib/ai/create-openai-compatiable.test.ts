import { describe, it, expect, vi } from "vitest";
import {
  createOpenAICompatibleModels,
  type OpenAICompatibleProvider,
} from "./create-openai-compatiable";

// Mock the @ai-sdk/openai-compatible module
vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: vi.fn(() =>
    vi.fn((apiName: string) => ({ apiName })),
  ),
}));

describe("createOpenAICompatibleModels", () => {
  it("should return empty providers and unsupportedModels when config is empty", () => {
    const result = createOpenAICompatibleModels([]);

    expect(result.providers).toEqual({});
    expect(result.unsupportedModels.size).toBe(0);
  });

  it("should return empty providers and unsupportedModels when config is undefined", () => {
    const result = createOpenAICompatibleModels(undefined as any);

    expect(result.providers).toEqual({});
    expect(result.unsupportedModels.size).toBe(0);
  });

  it("should create providers and models correctly", () => {
    const mockConfig: OpenAICompatibleProvider[] = [
      {
        provider: "test-provider",
        apiKey: "TEST_API_KEY",
        baseUrl: "https://api.test.com/v1",
        models: [
          {
            apiName: "test-model-1",
            uiName: "Test Model 1",
            supportsTools: true,
            supportedFileMimeTypes: [],
          },
          {
            apiName: "test-model-2",
            uiName: "Test Model 2",
            supportsTools: false,
            supportedFileMimeTypes: [],
          },
        ],
      },
    ];

    const result = createOpenAICompatibleModels(mockConfig);

    expect(result.providers).toHaveProperty("test-provider");
    expect(result.providers["test-provider"]).toHaveProperty("Test Model 1");
    expect(result.providers["test-provider"]).toHaveProperty("Test Model 2");
    expect(result.unsupportedModels.size).toBe(1);
  });

  it("should handle multiple providers", () => {
    const mockConfig: OpenAICompatibleProvider[] = [
      {
        provider: "provider-1",
        apiKey: "API_KEY_1",
        baseUrl: "https://api1.test.com/v1",
        models: [
          {
            apiName: "model-1",
            uiName: "Model 1",
            supportsTools: true,
            supportedFileMimeTypes: [],
          },
        ],
      },
      {
        provider: "provider-2",
        apiKey: "API_KEY_2",
        baseUrl: "https://api2.test.com/v1",
        models: [
          {
            apiName: "model-2",
            uiName: "Model 2",
            supportsTools: false,
            supportedFileMimeTypes: [],
          },
        ],
      },
    ];

    const result = createOpenAICompatibleModels(mockConfig);

    expect(result.providers).toHaveProperty("provider-1");
    expect(result.providers).toHaveProperty("provider-2");
    expect(result.providers["provider-1"]).toHaveProperty("Model 1");
    expect(result.providers["provider-2"]).toHaveProperty("Model 2");
    expect(result.unsupportedModels.size).toBe(1);
  });

  it("should track unsupported models correctly", () => {
    const mockConfig: OpenAICompatibleProvider[] = [
      {
        provider: "test-provider",
        apiKey: "TEST_API_KEY",
        baseUrl: "https://api.test.com/v1",
        models: [
          {
            apiName: "supported-model",
            uiName: "Supported Model",
            supportsTools: true,
            supportedFileMimeTypes: [],
          },
          {
            apiName: "unsupported-model-1",
            uiName: "Unsupported Model 1",
            supportsTools: false,
            supportedFileMimeTypes: [],
          },
          {
            apiName: "unsupported-model-2",
            uiName: "Unsupported Model 2",
            supportsTools: false,
            supportedFileMimeTypes: [],
          },
        ],
      },
    ];

    const result = createOpenAICompatibleModels(mockConfig);

    expect(result.providers["test-provider"]).toHaveProperty("Supported Model");
    expect(result.providers["test-provider"]).toHaveProperty(
      "Unsupported Model 1",
    );
    expect(result.providers["test-provider"]).toHaveProperty(
      "Unsupported Model 2",
    );
    expect(result.unsupportedModels.size).toBe(2);
  });

  it("should handle Azure OpenAI models with apiVersion parameter", () => {
    const mockConfig: OpenAICompatibleProvider[] = [
      {
        provider: "Azure OpenAI",
        apiKey: "azure-key",
        baseUrl: "https://test.openai.azure.com/openai/deployments/",
        models: [
          {
            apiName: "gpt-4o",
            uiName: "GPT-4o (Azure)",
            supportsTools: true,
            supportedFileMimeTypes: [],
            apiVersion: "2025-01-01-preview",
          },
          {
            apiName: "gpt-35-turbo",
            uiName: "GPT-3.5 Turbo (Azure)",
            supportsTools: true, // Changed to true to avoid unsupported models
            supportedFileMimeTypes: [],
            apiVersion: "2024-02-01",
          },
        ],
      },
    ];

    const result = createOpenAICompatibleModels(mockConfig);

    expect(result.providers).toHaveProperty("Azure OpenAI");
    expect(result.providers["Azure OpenAI"]).toHaveProperty("GPT-4o (Azure)");
    expect(result.providers["Azure OpenAI"]).toHaveProperty(
      "GPT-3.5 Turbo (Azure)",
    );
    expect(result.unsupportedModels.size).toBe(0);
  });

  it("should validate apiVersion is optional for non-Azure providers", () => {
    const mockConfig: OpenAICompatibleProvider[] = [
      {
        provider: "OpenAI",
        apiKey: "openai-key",
        baseUrl: "https://api.openai.com/v1",
        models: [
          {
            apiName: "gpt-4",
            uiName: "GPT-4",
            supportsTools: true,
            supportedFileMimeTypes: [],
            // No apiVersion - should still work
          },
        ],
      },
    ];

    const result = createOpenAICompatibleModels(mockConfig);

    expect(result.providers).toHaveProperty("OpenAI");
    expect(result.providers["OpenAI"]).toHaveProperty("GPT-4");
    expect(result.unsupportedModels.size).toBe(0);
  });

  it("should return empty fileSupportedModels when config is empty", () => {
    const result = createOpenAICompatibleModels([]);

    expect(result.fileSupportedModels).toBeDefined();
    expect(result.fileSupportedModels.size).toBe(0);
  });

  it("should register file support for models with supportedFileMimeTypes", () => {
    const mockConfig: OpenAICompatibleProvider[] = [
      {
        provider: "test-provider",
        apiKey: "TEST_API_KEY",
        baseUrl: "https://api.test.com/v1",
        models: [
          {
            apiName: "vision-model",
            uiName: "Vision Model",
            supportsTools: true,
            supportedFileMimeTypes: [
              "image/jpeg",
              "image/png",
              "application/pdf",
            ],
          },
          {
            apiName: "text-model",
            uiName: "Text Only Model",
            supportsTools: true,
            supportedFileMimeTypes: [],
          },
        ],
      },
    ];

    const result = createOpenAICompatibleModels(mockConfig);

    expect(result.fileSupportedModels.size).toBe(1);

    // Get the vision model and check its file support
    const visionModel = result.providers["test-provider"]["Vision Model"];
    const supportedMimeTypes = result.fileSupportedModels.get(visionModel);
    expect(supportedMimeTypes).toEqual([
      "image/jpeg",
      "image/png",
      "application/pdf",
    ]);

    // Text model should not be in fileSupportedModels (empty array)
    const textModel = result.providers["test-provider"]["Text Only Model"];
    expect(result.fileSupportedModels.has(textModel)).toBe(false);
  });

  it("should handle file support for Azure OpenAI models", () => {
    const mockConfig: OpenAICompatibleProvider[] = [
      {
        provider: "Azure OpenAI",
        apiKey: "azure-key",
        baseUrl: "https://test.openai.azure.com/openai/deployments/",
        models: [
          {
            apiName: "gpt-4-vision",
            uiName: "GPT-4 Vision (Azure)",
            supportsTools: true,
            apiVersion: "2025-01-01-preview",
            supportedFileMimeTypes: ["image/jpeg", "image/png", "image/webp"],
          },
        ],
      },
    ];

    const result = createOpenAICompatibleModels(mockConfig);

    expect(result.fileSupportedModels.size).toBe(1);

    const visionModel =
      result.providers["Azure OpenAI"]["GPT-4 Vision (Azure)"];
    const supportedMimeTypes = result.fileSupportedModels.get(visionModel);
    expect(supportedMimeTypes).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("should handle models without file support configuration", () => {
    const mockConfig: OpenAICompatibleProvider[] = [
      {
        provider: "test-provider",
        apiKey: "TEST_API_KEY",
        baseUrl: "https://api.test.com/v1",
        models: [
          {
            apiName: "basic-model",
            uiName: "Basic Model",
            supportsTools: true,
            supportedFileMimeTypes: [],
          },
        ],
      },
    ];

    const result = createOpenAICompatibleModels(mockConfig);

    expect(result.fileSupportedModels.size).toBe(0);
  });
});
