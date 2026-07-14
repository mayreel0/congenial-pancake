import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

type PraisePromptPost = {
  title: string;
  body: string;
  promptAnswers: unknown;
};

export type AiProvider = "gemini" | "openai";

export type AiProviderConfig = {
  provider: AiProvider;
  apiKey: string;
  model: string;
};

type AiEnv = Record<string, string | undefined>;

export function clampPraiseCount(count: number): number {
  return Math.max(1, Math.min(3, count));
}

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
    model: env.GEMINI_MODEL || "gemini-2.5-flash-lite"
  };
}

export function buildPraisePrompt(post: PraisePromptPost): string {
  return [
    "너는 칭찬 커뮤니티의 AI 칭찬 댓글 작성자다.",
    "댓글에는 AI 칭찬임을 자연스럽게 드러내라.",
    "사용자의 노력, 용기, 지속성, 배려, 배움, 완료를 구체적으로 칭찬하라.",
    "의료, 법률, 금융 조언과 외모/신체/정체성 평가는 피하라.",
    `제목: ${post.title}`,
    `본문: ${post.body}`,
    `작성 프롬프트 답변: ${JSON.stringify(post.promptAnswers ?? {})}`,
    "한국어 댓글만 작성하라. 각 댓글은 160자 이내로 작성하라."
  ].join("\n");
}

function buildGenerationPrompt(post: PraisePromptPost, count: number): string {
  return [
    buildPraisePrompt(post),
    `댓글 ${count}개를 작성하라.`,
    "각 댓글은 서로 다른 줄에 작성하고 번호, 따옴표, 설명은 붙이지 마라."
  ].join("\n");
}

function parseGeneratedComments(text: string, count: number): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, count);
}

function requireAiApiKey(config: AiProviderConfig): string {
  if (!config.apiKey) {
    throw new Error(config.provider === "gemini" ? "GEMINI_API_KEY_REQUIRED" : "OPENAI_API_KEY_REQUIRED");
  }

  return config.apiKey;
}

async function generateWithGemini(post: PraisePromptPost, count: number, config: AiProviderConfig): Promise<string[]> {
  const client = new GoogleGenAI({ apiKey: requireAiApiKey(config) });
  const response = await client.models.generateContent({
    model: config.model,
    contents: buildGenerationPrompt(post, count),
    config: { temperature: 0.8 }
  });

  return parseGeneratedComments(response.text ?? "", count);
}

async function generateWithOpenAI(post: PraisePromptPost, count: number, config: AiProviderConfig): Promise<string[]> {
  const client = new OpenAI({ apiKey: requireAiApiKey(config) });
  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [{ role: "user", content: buildPraisePrompt(post) }],
    temperature: 0.8,
    n: count
  });

  return completion.choices
    .map((choice) => choice.message.content?.trim())
    .filter((content): content is string => Boolean(content));
}

export async function generatePraiseComments(post: PraisePromptPost, count: number): Promise<string[]> {
  const clampedCount = clampPraiseCount(count);
  const config = getAiProviderConfig();

  if (config.provider === "openai") {
    return generateWithOpenAI(post, clampedCount, config);
  }

  return generateWithGemini(post, clampedCount, config);
}
