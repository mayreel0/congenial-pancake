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
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #f6f7f4 0%, #e9efe9 100%)",
        }}
      >
        <div
          style={{
            fontFamily: "Pretendard",
            fontWeight: 700,
            fontSize: 148,
            color: "#365f50",
            letterSpacing: "-0.02em",
          }}
        >
          온설
        </div>
        <div
          style={{
            fontFamily: "Pretendard",
            fontWeight: 500,
            fontSize: 36,
            color: "#676d63",
            marginTop: 28,
          }}
        >
          짧은 위로 요청과 담백한 답장을 주고받는 서비스
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
