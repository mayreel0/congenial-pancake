// 404 페이지의 앰비언트 배경(AmbientScene)이 참고하는 "무드" — 계절(4) ×
// 오전/오후(2) = 8가지. 온설은 한국 서비스라 KST 기준으로 계산한다 —
// packages/utils의 KST_OFFSET_MS 트릭과 동일(서버 UTC 러너에서도 항상
// KST로 계산되도록).
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

type Season = "spring" | "summer" | "fall" | "winter";
type TimeOfDay = "morning" | "afternoon";
type AmbientMood = `${Season}-${TimeOfDay}`;
type ParticleMotif = "petal" | "firefly" | "leaf" | "snow";

export type AmbientMoodConfig = {
  // 배경에 얇게 얹는 그라디언트 색상(테마의 --background 위에 낮은 알파로
  // 덧씌워지므로, 라이트/다크 모드는 그대로 유지되고 색감만 더해진다).
  washFrom: string;
  washTo: string;
  motif: ParticleMotif;
  // 파티클 자체 색상(모티프가 "leaf"인 경우 여러 색 중 매 파티클마다 하나를
  // 고른다 — 낙엽은 색이 균일하지 않아야 자연스럽다).
  particleColors: string[];
  glowColor: string;
  density: number;
  speed: number;
};

function seasonOf(monthKst: number): Season {
  if (monthKst >= 3 && monthKst <= 5) return "spring";
  if (monthKst >= 6 && monthKst <= 8) return "summer";
  if (monthKst >= 9 && monthKst <= 11) return "fall";
  return "winter";
}

export function ambientMoodOf(now: Date = new Date()): AmbientMood {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const season = seasonOf(kst.getUTCMonth() + 1);
  const timeOfDay: TimeOfDay =
    kst.getUTCHours() < 12 ? "morning" : "afternoon";
  return `${season}-${timeOfDay}`;
}

export const AMBIENT_MOOD_CONFIG: Record<AmbientMood, AmbientMoodConfig> = {
  "spring-morning": {
    washFrom: "rgba(255, 214, 224, 0.3)",
    washTo: "rgba(214, 233, 255, 0.12)",
    motif: "petal",
    particleColors: ["#f6c9d6", "#f9dbe4"],
    glowColor: "rgba(246, 201, 214, 0.5)",
    density: 22,
    speed: 0.6,
  },
  "spring-afternoon": {
    washFrom: "rgba(255, 196, 176, 0.28)",
    washTo: "rgba(255, 214, 224, 0.14)",
    motif: "petal",
    particleColors: ["#f2a8bd", "#f6c9d6"],
    glowColor: "rgba(242, 168, 189, 0.5)",
    density: 22,
    speed: 0.6,
  },
  "summer-morning": {
    washFrom: "rgba(190, 224, 214, 0.22)",
    washTo: "rgba(214, 235, 255, 0.1)",
    motif: "firefly",
    particleColors: ["#eaf27a", "#d7e88f"],
    glowColor: "rgba(234, 242, 122, 0.55)",
    density: 16,
    speed: 0.35,
  },
  "summer-afternoon": {
    washFrom: "rgba(255, 190, 140, 0.26)",
    washTo: "rgba(255, 224, 150, 0.12)",
    motif: "firefly",
    particleColors: ["#ffe08a", "#f7cf6b"],
    glowColor: "rgba(255, 224, 138, 0.6)",
    density: 18,
    speed: 0.35,
  },
  "fall-morning": {
    washFrom: "rgba(214, 181, 140, 0.22)",
    washTo: "rgba(233, 214, 181, 0.1)",
    motif: "leaf",
    particleColors: ["#c97a3d", "#d9a441", "#8a5a34"],
    glowColor: "rgba(201, 122, 61, 0.35)",
    density: 18,
    speed: 0.5,
  },
  "fall-afternoon": {
    washFrom: "rgba(224, 138, 80, 0.28)",
    washTo: "rgba(214, 181, 140, 0.14)",
    motif: "leaf",
    particleColors: ["#d9662f", "#e0973f", "#a1602f"],
    glowColor: "rgba(217, 102, 47, 0.35)",
    density: 18,
    speed: 0.5,
  },
  "winter-morning": {
    washFrom: "rgba(214, 224, 235, 0.24)",
    washTo: "rgba(235, 240, 245, 0.1)",
    motif: "snow",
    particleColors: ["#eef3f7", "#e2ecf2"],
    glowColor: "rgba(238, 243, 247, 0.4)",
    density: 26,
    speed: 0.3,
  },
  "winter-afternoon": {
    washFrom: "rgba(150, 162, 182, 0.24)",
    washTo: "rgba(198, 208, 220, 0.12)",
    motif: "snow",
    particleColors: ["#dbe4ec", "#c7d2dc"],
    glowColor: "rgba(219, 228, 236, 0.35)",
    density: 26,
    speed: 0.3,
  },
};
