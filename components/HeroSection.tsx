'use client';

import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/lib/language-context';

export default function HeroSection() {
  const { t } = useLanguage();
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const titleText = t('hero-title');

  useEffect(() => {
    let i = 0;
    const type = () => {
      if (i < titleText.length) {
        setTypedText(titleText.substring(0, i + 1));
        i++;

        // Start fading in subtitle and CTA when title is ~80% done
        if (i > titleText.length * 0.8) {
          setShowSubtitle(true);
          setShowCTA(true);
        }

        setTimeout(type, 100);
      } else {
        // Typing complete
        setIsTyping(false);
        setShowScrollIndicator(true);
      }
    };

    const timeout = setTimeout(() => {
      type();
    }, 300);

    return () => clearTimeout(timeout);
  }, [titleText]);

  const handleStartFocus = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (typeof window !== 'undefined') {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();

      // Calculate button position for clip-path animation
      const top = rect.top;
      const left = rect.left;
      const right = window.innerWidth - rect.right;
      const bottom = window.innerHeight - rect.bottom;

      // Click position
      const x = e.clientX;
      const y = e.clientY;

      window.dispatchEvent(
        new CustomEvent('enterFocusMode', {
          detail: { x, y, top, left, right, bottom },
        })
      );
    }
  };

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center snap-start px-4 text-center sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center gap-8">
          <h1
            className={`font-serif text-6xl font-bold leading-tight tracking-tight text-text-light-primary dark:text-text-dark-primary sm:text-7xl md:text-8xl min-h-[1.2em] ${
              isTyping ? 'typing-cursor' : ''
            }`}
          >
            {typedText}
          </h1>
          <p
            className={`max-w-4xl text-lg text-text-light-secondary dark:text-text-dark-secondary sm:text-xl transition-opacity duration-1000 ease-out ${
              showSubtitle ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {t('hero-subtitle')}
          </p>
          <button
            onClick={handleStartFocus}
            className={`inline-flex items-center justify-center rounded-full bg-text-light-primary px-8 py-3 text-lg font-medium text-background-light transition-all duration-300 hover:scale-105 active:scale-95 dark:bg-text-dark-primary dark:text-background-dark ease-out delay-200 animate-flowing-shadow ${
              showCTA ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {t('hero-cta')}
          </button>
        </div>
      </div>
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-opacity duration-1000 ease-out delay-500 ${
          showScrollIndicator ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <svg
          className="w-6 h-6 text-text-light-secondary dark:text-text-dark-secondary animate-float"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>
      </div>
    </section>
  );
}
