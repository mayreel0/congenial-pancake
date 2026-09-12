"use client";

import { useEffect, useRef, useState } from "react";
import {
  AMBIENT_MOOD_CONFIG,
  ambientMoodOf,
  type AmbientMoodConfig,
} from "../lib/ambient-mood";
import { loadSiteSettings } from "../lib/site-settings";

// 커서가 파티클에 "인지하는" 것처럼 보이게 하는 값 — 반경 안에 들어오면
// 살짝 밀려나고, decay로 서서히 원래 흐름으로 돌아온다(영구 이동 아님).
const POINTER_INTERACTION_RADIUS = 140;
const POINTER_PUSH_STRENGTH = 0.6;
const POINTER_DECAY = 0.94;

type Particle = {
  x: number;
  y: number;
  size: number;
  angle: number;
  angleSpeed: number;
  fallSpeed: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  pushVx: number;
  pushVy: number;
  blinkPhase: number;
};

function createParticles(
  count: number,
  width: number,
  height: number,
  config: AmbientMoodConfig,
): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 3 + Math.random() * 4,
    angle: Math.random() * Math.PI * 2,
    angleSpeed: 0.006 + Math.random() * 0.01,
    fallSpeed: config.motif === "firefly" ? 0 : 0.15 + Math.random() * 0.25,
    color:
      config.particleColors[
        Math.floor(Math.random() * config.particleColors.length)
      ],
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.02,
    pushVx: 0,
    pushVy: 0,
    blinkPhase: Math.random() * Math.PI * 2,
  }));
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  particle: Particle,
  config: AmbientMoodConfig,
  time: number,
) {
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);

  if (config.motif === "firefly") {
    const blink = 0.5 + 0.5 * Math.sin(time * 0.002 + particle.blinkPhase);
    ctx.globalAlpha = 0.25 + blink * 0.55;
    ctx.fillStyle = config.glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, particle.size * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.6 + blink * 0.4;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(0, 0, particle.size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else if (config.motif === "snow") {
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(0, 0, particle.size * 0.65, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // petal / leaf — 살짝 회전하며 떨어지는 타원
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, particle.size, particle.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function AmbientScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 서버/최초 클라이언트 렌더에선 localStorage를 못 읽으므로 null(=아직
  // 안 그림)로 시작 — 두 렌더가 똑같아야 hydration 불일치가 안 남. 설정을
  // 실제로 읽는 건 아래 첫 번째 effect뿐이고, 그 결과에 따라 무드가 정해지거나
  // (disable404Scene이면) 계속 null로 남아 아무것도 안 그린다.
  const [config, setConfig] = useState<AmbientMoodConfig | null>(null);
  const reduceMotionOverrideRef = useRef(false);

  useEffect(() => {
    // setState를 effect 본문에서 바로 부르면 react-hooks/set-state-in-effect에
    // 걸림 — useMinDisplayDuration과 같은 방식으로 setTimeout(…, 0) 콜백
    // 안으로 미룬다. 장식용 배경이라 한 틱 늦게 나타나는 건 문제없음(404
    // 페이지에서 커서 반응/무드 배경보다 더 중요한 건 없으니 지연 자체를
    // 신경 쓸 필요가 없다).
    const timer = window.setTimeout(() => {
      const settings = loadSiteSettings();
      reduceMotionOverrideRef.current = settings.reduceMotion;
      if (settings.disable404Scene) return; // config는 null로 남고 아무것도 안 그림

      const mood =
        settings.ambientMode === "manual" ? settings.manualMood : ambientMoodOf();
      setConfig(AMBIENT_MOOD_CONFIG[mood]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!config) return;
    // 아래 resize/step 클로저 안에서도 좁혀진 타입(null 아님)을 유지하려고
    // 새 로컬 상수에 담아 씀 — TS는 상위 스코프 변수의 null 체크를 중첩
    // 함수 경계까지 그대로 넘겨주지 않는다.
    const activeConfig = config;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return; // 캔버스 미지원 환경 — 애니메이션 없이 조용히 스킵

    const prefersReducedMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      reduceMotionOverrideRef.current;
    const dpr = window.devicePixelRatio || 1;

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    let particles: Particle[] = [];

    function resize() {
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = createParticles(activeConfig.density, width, height, activeConfig);
    }
    resize();
    window.addEventListener("resize", resize);

    const pointer = { x: -9999, y: -9999 };
    function handlePointerMove(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    }
    window.addEventListener("pointermove", handlePointerMove);

    let frame = 0;
    function step(time: number) {
      ctx!.clearRect(0, 0, width, height);

      for (const particle of particles) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < POINTER_INTERACTION_RADIUS && distance > 0.01) {
          const falloff = 1 - distance / POINTER_INTERACTION_RADIUS;
          particle.pushVx += (dx / distance) * falloff * POINTER_PUSH_STRENGTH;
          particle.pushVy += (dy / distance) * falloff * POINTER_PUSH_STRENGTH;
        }
        particle.pushVx *= POINTER_DECAY;
        particle.pushVy *= POINTER_DECAY;

        particle.angle += particle.angleSpeed;
        const sway = Math.sin(particle.angle) * 0.4;
        const bob =
          activeConfig.motif === "firefly" ? Math.cos(particle.angle * 1.3) * 0.35 : 0;

        particle.x += (sway + particle.pushVx) * activeConfig.speed;
        particle.y += (bob + particle.fallSpeed + particle.pushVy) * activeConfig.speed;
        particle.rotation += particle.rotationSpeed * activeConfig.speed;

        if (particle.y - particle.size > height) {
          particle.y = -particle.size;
          particle.x = Math.random() * width;
        }
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;

        drawParticle(ctx!, particle, activeConfig, time);
      }

      if (!prefersReducedMotion) {
        frame = requestAnimationFrame(step);
      }
    }

    if (prefersReducedMotion) {
      step(0); // 정지된 한 프레임만 그리고 루프는 시작하지 않음
    } else {
      frame = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [config]);

  if (!config) return null; // 최초 렌더 중 / disable404Scene 설정

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${config.washFrom}, ${config.washTo})`,
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
