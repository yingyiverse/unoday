'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/lib/language-context';

class Ripple {
  x: number;
  y: number;
  bornTime: number;
  age: number = 0;
  lifespan: number = 4000;
  frequency: number = 0.02;
  speed: number = 0.15;
  damping: number = 0.001;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.bornTime = performance.now();
  }

  update(currentTime: number): boolean {
    this.age = currentTime - this.bornTime;
    return this.age < this.lifespan;
  }

  draw(ctx: CanvasRenderingContext2D, isDark: boolean) {
    const age = this.age;
    const shadowColor = isDark ? '0, 0, 0' : '160, 160, 160';
    const highlightColor = isDark ? '255, 255, 255' : '255, 255, 255';
    const offset = 1.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    const waveCount = 3;

    for (let i = 0; i < waveCount; i++) {
      const waveOffset = i * 150;
      if (age < waveOffset) continue;

      const waveAge = age - waveOffset;
      const radius = waveAge * this.speed;

      let amplitude = (1 / Math.sqrt(Math.max(radius, 10))) * 10;
      amplitude *= Math.exp(-this.damping * waveAge);

      if (waveAge < 200) amplitude *= waveAge / 200;
      if (this.age > this.lifespan - 1000) amplitude *= (this.lifespan - this.age) / 1000;

      if (amplitude < 0.01) continue;

      const lw = Math.max(2, 6 * amplitude);
      ctx.lineWidth = lw;

      // Draw Shadow
      ctx.beginPath();
      ctx.arc(offset, offset, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${shadowColor}, ${amplitude * 0.4})`;
      ctx.stroke();

      // Draw Highlight
      ctx.beginPath();
      ctx.arc(-offset, -offset, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${highlightColor}, ${amplitude * 0.6})`;
      ctx.stroke();
    }

    ctx.restore();
  }
}

export default function LetGoSection() {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);
  const ripplesRef = useRef<Ripple[]>([]);
  const animationIdRef = useRef<number | null>(null);
  const lastAutoRippleTimeRef = useRef(0);
  const nextAutoRippleDelayRef = useRef(2000);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    // Check dark mode
    setIsDark(document.documentElement.classList.contains('dark'));

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    window.addEventListener('resize', resize);

    // Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisibleRef.current = true;
            lastAutoRippleTimeRef.current = performance.now();
            nextAutoRippleDelayRef.current = 100;
          } else {
            isVisibleRef.current = false;
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(container);

    // Animation Loop
    const animate = (currentTime: number) => {
      ctx.clearRect(0, 0, width, height);

      // Auto-ripples
      if (isVisibleRef.current && currentTime - lastAutoRippleTimeRef.current > nextAutoRippleDelayRef.current) {
        const count = Math.random() > 0.7 ? 2 : 1;

        for (let i = 0; i < count; i++) {
          const padding = 150;
          const minX = padding;
          const maxX = Math.max(padding, width - padding);
          const x = minX + Math.random() * (maxX - minX);

          const startY = Math.max(height * 0.33, padding);
          const endY = Math.max(startY, height - padding);
          const y = startY + Math.random() * (endY - startY);

          ripplesRef.current.push(new Ripple(x, y));
        }

        lastAutoRippleTimeRef.current = currentTime;
        nextAutoRippleDelayRef.current = 2000 + Math.random() * 3000;
      }

      // Update and draw ripples
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const ripple = ripplesRef.current[i];
        if (ripple.update(currentTime)) {
          ripple.draw(ctx, isDark);
        } else {
          ripplesRef.current.splice(i, 1);
        }
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      observer.disconnect();
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isDark]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ripplesRef.current.push(new Ripple(x, y));
  };

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen w-full flex-col items-center justify-start snap-start bg-gray-100 dark:bg-gray-900/50 py-20 sm:py-32 overflow-hidden"
    >
      {/* Ink Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0"></canvas>

      {/* Content */}
      <div onClick={handleClick} className="absolute inset-0 z-10 cursor-crosshair flex flex-col items-center justify-center">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8 pointer-events-none">
          <div className="flex flex-col items-center gap-12 pointer-events-auto">
            <h2 className="font-serif text-5xl font-bold leading-tight tracking-tight text-text-light-primary dark:text-text-dark-primary sm:text-6xl md:text-7xl">
              {t('section-3-title')}
            </h2>

            <p className="max-w-2xl text-lg text-text-light-secondary dark:text-text-dark-secondary sm:text-xl leading-relaxed">
              {t('section-3-text')}
            </p>

            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary opacity-60">
              {t('section-3-hint')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
