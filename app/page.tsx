'use client';

import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import OnlyNowSection from '@/components/OnlyNowSection';
import LetGoSection from '@/components/LetGoSection';
import WitnessProgressSection from '@/components/WitnessProgressSection';
import FocusMode from '@/components/FocusMode';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <div className="flex h-full flex-1 grow flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center">
          <HeroSection />
          <OnlyNowSection />
          <LetGoSection />
          <WitnessProgressSection />
        </main>
        <Footer />
      </div>
      <FocusMode />
    </div>
  );
}
