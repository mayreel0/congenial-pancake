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
const defaultGeminiModel = "gemini-3.1-flash-lite";
const crisisInputReason = "safety:crisis_input_detected" as const;

const crisisPatterns = [
  /자해/,
  /극단적\s*선택/,
  /죽고\s*싶/,
  /죽어\s*버리/,
  /목숨을?\s*끊/,
  /삶을?\s*끝/,
  /그만\s*살고\s*싶/,
  /사라지고\s*싶/,
  /kill myself/i,
  /end my life/i,
  /take my own life/i,
  /suicid(?:e|al)/i,
  /self[-\s]?harm/i,
  /want to die/i
];

const aiDisclosurePatterns = [/^(?:(?:ai|as an ai)\b|인공지능|자동\s*생성|자동\s*칭찬|ai\s*칭찬)\s*[:：-]?\s*/i];
const adviceTonePatterns = [
  /상담(?:사|을|이|받)/,
  /조언(?:을|드리|하)/,
  /치료(?:를|받|하)/,
  /병원에?\s*(?:가|방문|상담)/,
  /의사(?:와|에게|를)?\s*(?:상담|진료)/,
  /진단/,
  /약을?\s*(?:먹|복용)/,
  /변호사|법률|고소|소송/,
  /투자|주식|대출|보험|세금/
];
const appearanceIdentityPatterns = [
  /외모|몸매|체중|살쪘|살이\s*빠|다이어트/,
  /예쁘|잘생|못생|피부|얼굴|키가\s*(?:크|작)/,
  /남자라서|여자라서|장애(?:인|가)|정체성/
];

function stringifyPromptAnswers(promptAnswers: unknown): string {
  try {
    return JSON.stringify(promptAnswers ?? {});
  } catch {
    return "";
  }
}

function normalizeCommentForDuplicate(body: string): string {
  return body.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

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

export function classifyAiPraiseInputSafety(
  post: PraisePromptPost
): { safe: true } | { safe: false; reason: typeof crisisInputReason } {
  const inputText = [post.title, post.body, stringifyPromptAnswers(post.promptAnswers)].join("\n");
  if (crisisPatterns.some((pattern) => pattern.test(inputText))) {
    return { safe: false, reason: crisisInputReason };
  }

  return { safe: true };
}

export function validateGeneratedPraiseComments(comments: string[]): string[] {
  const seen = new Set<string>();
  const validComments: string[] = [];

  for (const comment of comments) {
    const body = comment.trim();
    const duplicateKey = normalizeCommentForDuplicate(body);

    if (!body || body.length > 120 || !/[가-힣]/.test(body)) continue;
    if (!duplicateKey || seen.has(duplicateKey)) continue;
    if (aiDisclosurePatterns.some((pattern) => pattern.test(body))) continue;
    if (adviceTonePatterns.some((pattern) => pattern.test(body))) continue;
    if (appearanceIdentityPatterns.some((pattern) => pattern.test(body))) continue;
    if (crisisPatterns.some((pattern) => pattern.test(body))) continue;

    seen.add(duplicateKey);
    validComments.push(body);
  }

  return validComments;
}

export function buildPraisePrompt(post: PraisePromptPost): string {
  return [
    "너는 칭찬 커뮤니티의 일반 사용자처럼 댓글을 쓴다.",
    "작성 주체를 설명하지 말고, 자동 생성된 듯한 표현을 피하라.",
    "짧고 자연스럽게 말하되 사용자의 노력, 용기, 지속성, 배려, 배움, 완료를 구체적으로 칭찬하라.",
    "과장된 감탄, 상담 말투, 홍보 문구, 반복적인 문장 구조를 피하라.",
    "의료, 법률, 금융 조언과 외모/신체/정체성 평가는 피하라.",
    `제목: ${post.title}`,
    `본문: ${post.body}`,
    `작성 프롬프트 답변: ${JSON.stringify(post.promptAnswers ?? {})}`,
    "한국어 댓글만 작성하라. 각 댓글은 120자 이내로 작성하라."
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
