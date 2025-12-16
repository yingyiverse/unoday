'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/language-context';

export default function Header() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header className="absolute top-0 left-0 right-0 p-6 sm:p-8 z-10">
      <div className="flex items-center justify-between text-text-light-primary dark:text-text-dark-primary">
        <div className="flex items-center">
          <h2 className="text-2xl font-extralight tracking-tight flex items-center font-logo">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <span>Un</span>
              <span className="inline-block w-3 h-3 rounded-full bg-current ml-[0.5px] mr-[3px]"></span>
              <span>Day</span>
            </Link>
          </h2>
        </div>
        <div className="flex items-center gap-4 pr-2 sm:pr-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-6 mr-4 border-r border-gray-200 dark:border-gray-700 pr-6">
            <Link
              href="/"
              className={`text-sm font-serif font-medium transition-opacity ${
                pathname === '/'
                  ? 'border-b-[1.5px] border-text-light-primary dark:border-text-dark-primary pb-0.5'
                  : 'hover:opacity-70 text-text-light-secondary dark:text-text-dark-secondary'
              }`}
            >
              {t('nav-uno')}
            </Link>
            <Link
              href="/witness"
              className={`text-sm font-serif font-medium transition-opacity ${
                pathname === '/witness'
                  ? 'border-b-[1.5px] border-text-light-primary dark:border-text-dark-primary pb-0.5'
                  : 'hover:opacity-70 text-text-light-secondary dark:text-text-dark-secondary'
              }`}
            >
              {t('nav-witness')}
            </Link>
          </div>

          <a href="https://github.com/yingyiverse/unoday" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" aria-label="GitHub">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </a>
          {/* Language Switcher */}
          <div className="relative flex items-center" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLangMenuOpen(!langMenuOpen);
              }}
              className="inline-flex items-center justify-center hover:opacity-70 transition-opacity"
              aria-label="Language"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                ></path>
              </svg>
            </button>
            {/* Language Dropdown */}
            {langMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-20">
                <button
                  onClick={() => {
                    setLanguage('en');
                    setLangMenuOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    language === 'en' ? 'font-bold' : ''
                  }`}
                >
                  {t('lang-en')}
                </button>
                <button
                  onClick={() => {
                    setLanguage('zh');
                    setLangMenuOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    language === 'zh' ? 'font-bold' : ''
                  }`}
                >
                  {t('lang-zh')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
