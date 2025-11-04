import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ParallaxHeaderProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number; // 0.1–0.4 рекомендуемо
}

/**
 * ParallaxHeader — современный минималистичный хедер с эффектом параллакса.
 *
 * Особенности:
 * - Плавный параллакс на transform/opacity (GPU, 60 FPS)
 * - Градиентный фон в стиле hero, с blur для глубины
 * - Учитывает prefers-reduced-motion (отключает анимацию)
 * - Безопасные зоны (safe areas) для мобильных
 */
export const ParallaxHeader: React.FC<ParallaxHeaderProps> = ({
  children,
  className,
  intensity = 0.2,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    let rafId = 0;
    let lastScrollY = window.scrollY;

    const animate = () => {
      const el = containerRef.current;
      if (!el) return;

      const currentScroll = window.scrollY;
      // Смещение и легкое затухание при скролле
      const offset = Math.max(0, currentScroll * intensity);
      const opacity = Math.max(0.7, 1 - currentScroll * 0.0015);

      el.style.transform = `translate3d(0, ${offset}px, 0)`;
      el.style.opacity = `${opacity}`;
      el.style.willChange = "transform, opacity";

      lastScrollY = currentScroll;
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [intensity, prefersReducedMotion]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/20",
        "bg-[var(--gradient-hero)] backdrop-blur-xl",
        "safe-area-inset",
        className
      )}
    >
      {/* Градиентные акценты */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 300px at 10% -20%, hsl(var(--primary) / 0.15), transparent 60%)," +
            "radial-gradient(1200px 300px at 90% -20%, hsl(var(--accent) / 0.12), transparent 60%)",
        }}
      />

      {/* Контент хедера с параллаксом */}
      <div
        ref={containerRef}
        className={cn(
          "relative z-10 px-4 py-6 sm:px-5",
          "transition-transform duration-0 ease-linear"
        )}
      >
        {children}
      </div>
    </div>
  );
};

ParallaxHeader.displayName = "ParallaxHeader";

export default ParallaxHeader;