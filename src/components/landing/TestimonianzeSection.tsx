import { motion, useScroll, useTransform } from "framer-motion";
import { Star, Play } from "lucide-react";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Testimonial = {
  id: string;
  video_url: string;
  video_type: string;
  is_vertical: boolean;
  title: string;
  client_name: string | null;
};

const getEmbedUrl = (url: string, type: string) => {
  if (type === "youtube") {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?/]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : url;
  }
  if (type === "vimeo") {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1` : url;
  }
  return url;
};

const VideoTestimonial = ({ url, type }: { url: string; type: string }) => {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isEmbed = type === "youtube" || type === "vimeo";

  const handlePlay = () => {
    if (isEmbed) {
      setPlaying(true);
    } else if (videoRef.current) {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/20 transition-colors aspect-[9/16] h-[380px] md:h-[440px] flex-shrink-0">
      {isEmbed ? (
        playing ? (
          <iframe src={getEmbedUrl(url, type)} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <button onClick={handlePlay} className="absolute inset-0 flex items-center justify-center bg-foreground/10 hover:bg-foreground/20 transition-colors cursor-pointer">
              <div className="w-16 h-16 rounded-full gradient-blue flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 transition-transform">
                <Play size={28} className="text-primary-foreground ml-1" />
              </div>
            </button>
          </div>
        )
      ) : (
        <>
          <video ref={videoRef} src={url} controls={playing} playsInline preload="metadata" className="w-full h-full object-cover" onEnded={() => setPlaying(false)} />
          {!playing && (
            <button onClick={handlePlay} className="absolute inset-0 flex items-center justify-center bg-foreground/10 hover:bg-foreground/20 transition-colors cursor-pointer">
              <div className="w-16 h-16 rounded-full gradient-blue flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 transition-transform">
                <Play size={28} className="text-primary-foreground ml-1" />
              </div>
            </button>
          )}
        </>
      )}
    </div>
  );
};

const textTestimonials = [
  { name: "Thomas Berger", company: "Segelshop Hamburg, Germany", quote: "Easysea products sell themselves. The Flipper winch handle is our #1 bestseller — customers love it.", stars: 5 },
  { name: "Sophie Martin", company: "Voiles & Mer, France", quote: "The B2B portal makes ordering effortless. Real-time stock, dedicated pricing, and fast shipping across Europe.", stars: 5 },
  { name: "James Whitfield", company: "SailTech UK, United Kingdom", quote: "250+ 5-star reviews speak for themselves. Easysea delivers quality and innovation like no other brand.", stars: 5 },
];

const testimonialCardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

const TestimonialsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const { data: videos } = useQuery({
    queryKey: ["landing-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return (data || []) as Testimonial[];
    },
  });

  return (
    <section ref={sectionRef} id="partners" className="py-32 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div style={{ y: parallaxY }} className="text-center mb-20">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[11px] uppercase tracking-[0.4em] text-primary font-heading font-bold mb-5"
          >
            Trusted worldwide
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="font-heading text-3xl md:text-5xl lg:text-6xl font-black text-foreground"
          >
            What our <span className="text-gradient-blue">dealers say</span>
          </motion.h2>
        </motion.div>

        {/* Video Testimonials */}
        {videos && videos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-16 flex flex-wrap items-center justify-center gap-6"
          >
            {videos.map((v) => (
              <VideoTestimonial key={v.id} url={v.video_url} type={v.video_type} />
            ))}
          </motion.div>
        )}

        {/* Text Testimonials */}
        <div className="grid md:grid-cols-3 gap-5">
          {textTestimonials.map((t, i) => (
            <motion.div
              key={t.name}
              custom={i}
              variants={testimonialCardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              whileHover={{ y: -6, transition: { duration: 0.3 } }}
              className="glass-card-solid p-8 hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <motion.div
                    key={j}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 + j * 0.05, type: "spring", stiffness: 400 }}
                  >
                    <Star size={13} className="fill-warning text-warning" />
                  </motion.div>
                ))}
              </div>
              <p className="text-foreground/80 text-sm italic mb-7 leading-relaxed">"{t.quote}"</p>
              <div>
                <p className="font-heading text-sm font-bold text-foreground">{t.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t.company}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
