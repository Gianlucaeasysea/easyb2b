import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/ChiSiamoSection";
import ProductsSection from "@/components/landing/ProdottiSection";
import HowItWorksSection from "@/components/landing/ComeFunzionaSection";
import TestimonialsSection from "@/components/landing/TestimonianzeSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => (
  <>
    <Navbar />
    <HeroSection />
    <AboutSection />
    <ProductsSection />
    <HowItWorksSection />
    <TestimonialsSection />
    <CTASection />
    <Footer />
  </>
);

export default Index;
