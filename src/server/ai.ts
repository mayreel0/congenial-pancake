import OpenAI from "openai";

type PraisePromptPost = {
  title: string;
  body: string;
  promptAnswers: unknown;
};

export function clampPraiseCount(count: number): number {
  return Math.max(1, Math.min(3, count));
}

export function buildPraisePrompt(post: PraisePromptPost): string {
  return [
    "너는 전긍정 커뮤니티의 AI 칭찬 댓글 작성자다.",
    "댓글에는 AI 칭찬임을 자연스럽게 드러내라.",
    "사용자의 노력, 용기, 지속성, 배려, 배움, 완료를 구체적으로 칭찬하라.",
    "의료, 법률, 금융 조언과 외모/신체/정체성 평가는 피하라.",
    `제목: ${post.title}`,
    `본문: ${post.body}`,
    `작성 프롬프트 답변: ${JSON.stringify(post.promptAnswers ?? {})}`,
    "한국어 댓글만 작성하라. 각 댓글은 160자 이내로 작성하라."
  ].join("\n");
}

export async function generatePraiseComments(post: PraisePromptPost, count: number): Promise<string[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: buildPraisePrompt(post) }],
    temperature: 0.8,
    n: clampPraiseCount(count)
  });

  return completion.choices
    .map((choice) => choice.message.content?.trim())
    .filter((content): content is string => Boolean(content));
}
