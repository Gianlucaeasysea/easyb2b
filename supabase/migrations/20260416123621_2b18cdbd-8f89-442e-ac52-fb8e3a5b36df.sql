
CREATE TABLE public.homepage_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read homepage_settings"
ON public.homepage_settings FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage homepage_settings"
ON public.homepage_settings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.homepage_settings (section, content) VALUES
('hero', '{"badge":"B2B Dealer Platform","title_line1":"Your Nautical","title_line2":"Business Hub","subtitle_line1":"Premium accessories, exclusive B2B pricing","subtitle_line2":"& dedicated dealer support","description":"Join 250+ dealers worldwide. Exclusive pricing, premium products, and dedicated support to grow your nautical business.","stat1_value":"250+","stat1_label":"Dealers","stat2_value":"16+","stat2_label":"Products","stat3_value":"431+","stat3_label":"Reviews"}'::jsonb);

CREATE TABLE public.text_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL,
  quote text NOT NULL,
  stars integer NOT NULL DEFAULT 5,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.text_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read text_testimonials"
ON public.text_testimonials FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage text_testimonials"
ON public.text_testimonials FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.text_testimonials (name, company, quote, stars, sort_order) VALUES
('Thomas Berger', 'Segelshop Hamburg, Germany', 'Easysea products sell themselves. The Flipper winch handle is our #1 bestseller — customers love it.', 5, 0),
('Sophie Martin', 'Voiles & Mer, France', 'The B2B portal makes ordering effortless. Real-time stock, dedicated pricing, and fast shipping across Europe.', 5, 1),
('James Whitfield', 'SailTech UK, United Kingdom', '250+ 5-star reviews speak for themselves. Easysea delivers quality and innovation like no other brand.', 5, 2);
