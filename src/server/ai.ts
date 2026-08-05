export type AiProvider = "gemini" | "openai";

export type AiProviderConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
};

type AiEnv = Record<string, string | undefined>;
const defaultGeminiModel = "gemini-3.1-flash-lite";

export function getAiProviderConfig(env: AiEnv = process.env): AiProviderConfig {
  const provider = env.AI_PROVIDER?.toLowerCase() === "openai" ? "openai" : "gemini";

  if (provider === "openai") {
    return {
      provider,
      apiKey: env.OPENAI_API_KEY ?? "",
      model: env.OPENAI_MODEL || "gpt-4o-mini"
    };
  }

  return {
    provider,
    apiKey: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || "",
    model: env.GEMINI_MODEL || defaultGeminiModel
  };
}

export function getAiProviderErrorReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("API_KEY_REQUIRED")) return "provider_error:missing_api_key";
  if (/UNAUTHENTICATED|unauthori[sz]ed|invalid api key|401|403|permission denied/i.test(message)) {
    return "provider_error:auth_failed";
  }
  if (/NOT_FOUND|404|no longer available|not found/i.test(message)) return "provider_error:model_not_found";
  if (/RESOURCE_EXHAUSTED|429|rate limit|quota/i.test(message)) return "provider_error:rate_limited";
  if (/timeout|timed out|deadline exceeded|ETIMEDOUT|AbortError/i.test(message)) return "provider_error:timeout";
  if (/SAFETY|blocked|prohibited|finishReason.*SAFETY/i.test(message)) return "provider_error:safety_blocked";
  if (/empty|malformed|invalid json|unexpected response|no candidates|no choices/i.test(message)) {
    return "provider_error:empty_or_malformed_response";
  }

  return "provider_error:generic";
}
