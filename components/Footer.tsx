'use client';

import { useLanguage } from '@/lib/language-context';

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-8 px-4 border-t border-gray-200 dark:border-gray-800 snap-end">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-light-secondary dark:text-text-dark-secondary font-serif">
        <div>
          {t('footer-copyright').replace('{year}', currentYear.toString())}
        </div>
        <div className="flex gap-6">
          <a
            href="/privacy"
            className="hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
          >
            {t('footer-privacy')}
          </a>
          <a
            href="/terms"
            className="hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
          >
            {t('footer-terms')}
          </a>
        </div>
      </div>
    </footer>
  );
}
