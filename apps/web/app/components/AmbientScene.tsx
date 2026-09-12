"use client";

import { useEffect, useRef, useState } from "react";
import {
  AMBIENT_MOOD_CONFIG,
  ambientMoodOf,
  type AmbientMoodConfig,
} from "../lib/ambient-mood";

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
  // 마운트 시점 한 번만 고른 무드 — 매 렌더마다 시각이 바뀌어 다른 무드로
  // 흔들리면 안 되므로 lazy useState 초기값으로 고정.
  const [config] = useState<AmbientMoodConfig>(
    () => AMBIENT_MOOD_CONFIG[ambientMoodOf()],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return; // 캔버스 미지원 환경 — 애니메이션 없이 조용히 스킵

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
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
      particles = createParticles(config.density, width, height, config);
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
          config.motif === "firefly" ? Math.cos(particle.angle * 1.3) * 0.35 : 0;

        particle.x += (sway + particle.pushVx) * config.speed;
        particle.y += (bob + particle.fallSpeed + particle.pushVy) * config.speed;
        particle.rotation += particle.rotationSpeed * config.speed;

        if (particle.y - particle.size > height) {
          particle.y = -particle.size;
          particle.x = Math.random() * width;
        }
        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;

        drawParticle(ctx!, particle, config, time);
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
