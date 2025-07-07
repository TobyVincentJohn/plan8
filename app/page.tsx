import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen pt-8">
      <Navigation />
      <HeroSection />
      <Footer />
    </main>
  );
}