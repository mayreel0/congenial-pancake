import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "온설 — 짧은 위로 요청과 담백한 답장을 주고받는 서비스";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRETENDARD_DIR = path.join(
  process.cwd(),
  "node_modules/pretendard/dist/public/static",
);

export default async function OpengraphImage() {
  const [bold, medium] = await Promise.all([
    readFile(path.join(PRETENDARD_DIR, "Pretendard-Bold.otf")),
    readFile(path.join(PRETENDARD_DIR, "Pretendard-Medium.otf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          // globals.css의 다크 테마 토큰(--background/--surface)을 그대로 씀 —
          // OG 카드는 뷰어의 실제 테마에 반응할 수 없으니(크롤러가 만드는
          // 고정 이미지) 서비스 자체의 다크 팔레트를 고정값으로 채택.
          background: "linear-gradient(155deg, #171411 0%, #211c18 100%)",
        }}
      >
        {/* 단일 은은한 원 — 여러 개 흩뿌린 장식 대신 하나로 무게중심을 잡는다.
            브랜드 accent(세이지)로 그려서 따뜻한 primary 워드마크 뒤에
            차가운 톤 하나가 은은하게 대비되게. */}
        <div
          style={{
            position: "absolute",
            width: 640,
            height: 640,
            borderRadius: "50%",
            left: -180,
            bottom: -220,
            background:
              "radial-gradient(circle, rgba(159,176,159,0.28) 0%, rgba(159,176,159,0) 70%)",
          }}
        />

        {/* 캡션 — 헤드라인과 같은 블록에 쌓지 않고 반대쪽 모서리에 따로 둬서
            "제목+부제" 슬라이드 구도를 깬다. */}
        <div
          style={{
            position: "absolute",
            top: 88,
            right: 96,
            display: "flex",
            fontFamily: "Pretendard",
            fontWeight: 500,
            fontSize: 28,
            color: "#b0a797",
            letterSpacing: "0.02em",
          }}
        >
          짧은 위로 요청과 담백한 답장을 주고받는 서비스
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            bottom: 72,
            display: "flex",
            fontFamily: "Pretendard",
            fontWeight: 700,
            fontSize: 220,
            color: "#be8c71",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          온설
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: bold, weight: 700, style: "normal" },
        { name: "Pretendard", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
