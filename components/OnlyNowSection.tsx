'use client';

import { useLanguage } from '@/lib/language-context';

export default function OnlyNowSection() {
  const { t } = useLanguage();

  return (
    <section className="flex min-h-screen w-full flex-col items-center justify-center snap-start py-20 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-12">
          {/* Breathing Dot Visualization */}
          <div className="relative w-full h-48 flex items-center justify-center">
            {/* Present dot (breathing) - Black color */}
            <div className="breathing-dot absolute">
              <div className="w-6 h-6 rounded-full bg-text-light-primary dark:bg-text-dark-primary shadow-lg"></div>
            </div>
          </div>

          <h2 className="font-serif text-5xl font-bold leading-tight tracking-tight text-text-light-primary dark:text-text-dark-primary sm:text-6xl md:text-7xl">
            {t('section-2-title')}
          </h2>
          <p className="max-w-2xl text-lg text-text-light-secondary dark:text-text-dark-secondary sm:text-xl leading-relaxed">
            {t('section-2-text')}
          </p>
        </div>
      </div>
    </section>
  );
}
