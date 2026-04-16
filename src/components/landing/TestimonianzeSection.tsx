
import { motion, useScroll, useTransform } from "framer-motion";
import { Star, Play, VideoOff } from "lucide-react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type VideoTestimonialData = {
  id: string;
  video_url: string;
  video_type: string;
  is_vertical: boolean;
  title: string;
  client_name: string | null;
};

type TextTestimonialData = {
  id: string;
  name: string;
  company: string;
  quote: string;
  stars: number;
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

const getPreviewTime = (video: HTMLVideoElement) => {
  if (!Number.isFinite(video.duration) || video.duration <= 0) return 0;
  return Math.min(Math.max(video.duration * 0.1, 0.35), 1.25);
};

const VideoTestimonial = forwardRef<HTMLDivElement, { url: string; type: string }>(({ url, type }, ref) => {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isEmbed = type === "youtube" || type === "vimeo";

  const startPreview = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || isEmbed || playing) return;

    vid.pause();
    vid.muted = true;
    vid.loop = false;
    vid.controls = true;
    vid.playsInline = true;

    const previewTime = getPreviewTime(vid);
    if (previewTime > 0) {
      vid.currentTime = previewTime;
    }
  }, [isEmbed, playing]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || isEmbed) return;

    const onReady = () => {
      startPreview();
    };

    vid.addEventListener("loadedmetadata", onReady);
    vid.addEventListener("canplay", onReady);

    if (vid.readyState >= 1) {
      startPreview();
    }

    return () => {
      vid.removeEventListener("loadedmetadata", onReady);
      vid.removeEventListener("canplay", onReady);
    };
  }, [url, isEmbed, startPreview]);

  const handlePlay = async () => {
    if (isEmbed) {
      setPlaying(true);
      return;
    }

    const vid = videoRef.current;
    if (!vid) return;

    vid.loop = false;
    vid.controls = true;
    vid.playsInline = true;
    setPlaying(true);

    try {
      vid.muted = false;
      await vid.play();
    } catch {
      try {
        vid.muted = true;
        await vid.play();
      } catch {
        vid.pause();
        setPlaying(false);
      }
    }
  };

  const handleResetPreview = () => {
    setPlaying(false);
    startPreview();
  };

  return (
    <div ref={ref} className="relative rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/20 transition-colors aspect-[9/16] h-[380px] md:h-[440px] flex-shrink-0">
      {isEmbed ? (
        playing ? (
          <iframe src={getEmbedUrl(url, type)} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <button type="button" onClick={handlePlay} className="absolute inset-0 z-10 flex items-center justify-center bg-foreground/10 hover:bg-foreground/20 transition-colors cursor-pointer">
              <div className="w-16 h-16 rounded-full gradient-blue flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 transition-transform">
                <Play size={28} className="text-primary-foreground ml-1" />
              </div>
            </button>
          </div>
        )
      ) : (
        <video
          ref={videoRef}
          src={url}
          playsInline
          muted
          controls
          preload="metadata"
          className="w-full h-full object-cover"
          onPlay={() => setPlaying(true)}
          onClick={() => {
            if (!playing) {
              void handlePlay();
            }
          }}
          onEnded={handleResetPreview}
          onPause={() => {
            if (!videoRef.current?.ended) {
              setPlaying(false);
            }
          }}
        />
      )}
    </div>
  );
});

VideoTestimonial.displayName = "VideoTestimonial";

const testimonialCardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
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
      return (data || []) as VideoTestimonialData[];
    },
  });

  const { data: textReviews } = useQuery({
    queryKey: ["landing-text-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("text_testimonials")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return (data || []) as TextTestimonialData[];
    },
  });

  // Fallback hardcoded only if DB returns empty
  const displayReviews = textReviews && textReviews.length > 0
    ? textReviews
    : [
        { id: "1", name: "Thomas Berger", company: "Segelshop Hamburg, Germany", quote: "Easysea products sell themselves. The Flipper winch handle is our #1 bestseller — customers love it.", stars: 5 },
        { id: "2", name: "Sophie Martin", company: "Voiles & Mer, France", quote: "The B2B portal makes ordering effortless. Real-time stock, dedicated pricing, and fast shipping across Europe.", stars: 5 },
        { id: "3", name: "James Whitfield", company: "SailTech UK, United Kingdom", quote: "250+ 5-star reviews speak for themselves. Easysea delivers quality and innovation like no other brand.", stars: 5 },
      ];

  return (
    <section ref={sectionRef} id="partners" className="py-32 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div style={{ y: parallaxY }} className="text-center mb-20">
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-[11px] uppercase tracking-[0.4em] text-primary font-heading font-bold mb-5"
          >
            Trusted worldwide
          </motion.p>
          <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="font-heading text-3xl md:text-5xl lg:text-6xl font-black text-foreground"
          >
            What our <span className="text-gradient-blue">dealers say</span>
          </motion.h2>
        </motion.div>

        {videos && videos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.8 }} className="mb-16 flex flex-wrap items-center justify-center gap-6"
          >
            {videos.map((v) => (
              <VideoTestimonial key={v.id} url={v.video_url} type={v.video_type} />
            ))}
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {displayReviews.map((t, i) => (
            <motion.div
              key={t.id}
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
                  <motion.div key={j} initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.15 + j * 0.05, type: "spring", stiffness: 400 }}
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
