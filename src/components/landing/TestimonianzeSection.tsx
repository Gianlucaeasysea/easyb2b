import { motion } from "framer-motion";
import { Star, Play } from "lucide-react";
import { useState, useRef } from "react";

const TESTIMONIAL_VIDEO_URL = "https://irauraejdmkjkrbdudra.supabase.co/storage/v1/object/public/videos/testimonials/testimonial1.mp4";

const testimonials = [
  { name: "Thomas Berger", company: "Segelshop Hamburg, Germany", quote: "Easysea products sell themselves. The Flipper winch handle is our #1 bestseller — customers love it.", stars: 5 },
  { name: "Sophie Martin", company: "Voiles & Mer, France", quote: "The B2B portal makes ordering effortless. Real-time stock, dedicated pricing, and fast shipping across Europe.", stars: 5 },
  { name: "James Whitfield", company: "SailTech UK, United Kingdom", quote: "250+ 5-star reviews speak for themselves. Easysea delivers quality and innovation like no other brand.", stars: 5 },
];

const VideoTestimonial = () => {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-16"
    >
      <div className="relative rounded-2xl overflow-hidden glass-card-solid border-primary/20 max-w-4xl mx-auto aspect-video group">
        <video
          ref={videoRef}
          src={TESTIMONIAL_VIDEO_URL}
          controls={playing}
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center bg-foreground/30 hover:bg-foreground/40 transition-colors cursor-pointer"
          >
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <Play size={32} className="text-primary-foreground ml-1" />
            </div>
          </button>
        )}
      </div>
    </motion.div>
  );
};

const TestimonialsSection = () => (
  <section id="partners" className="py-28 section-alt">
    <div className="container mx-auto px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
        <p className="text-xs uppercase tracking-[0.3em] text-primary font-heading font-semibold mb-4">Trusted worldwide</p>
        <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground">What our dealers say</h2>
      </motion.div>

      {/* Video Testimonial */}
      <VideoTestimonial />

      {/* Text Testimonials */}
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
            className="glass-card-solid p-8 hover:border-primary/30 transition-colors">
            <div className="flex gap-0.5 mb-5">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} size={14} className="fill-warning text-warning" />
              ))}
            </div>
            <p className="text-foreground/80 text-sm italic mb-6 leading-relaxed">"{t.quote}"</p>
            <div>
              <p className="font-heading text-sm font-bold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.company}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
