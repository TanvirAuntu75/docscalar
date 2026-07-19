import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Ecosystem } from './components/Ecosystem';
import { WhyUs } from './components/WhyUs';
import { CVBuilder } from './components/CVBuilder';
import { Pricing } from './components/Pricing';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="bg-brand-bg min-h-screen font-sans">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Ecosystem />
        <WhyUs />
        <CVBuilder />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
