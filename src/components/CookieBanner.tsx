import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, Settings } from "lucide-react";

interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const STORAGE_KEY = "cookie-consent";

const getStoredConsent = (): CookieConsent | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const saveConsent = (c: CookieConsent) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setVisible(false);
  };

  const acceptAll = () => saveConsent({ necessary: true, analytics: true, marketing: true });
  const necessaryOnly = () => saveConsent({ necessary: true, analytics: false, marketing: false });
  const saveCustom = () => saveConsent(consent);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card shadow-2xl p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-heading font-semibold text-foreground text-sm">Cookie Preferences</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                We use cookies to improve your experience. Read our{" "}
                <Link to="/cookie-policy" className="underline hover:text-foreground">
                  Cookie Policy
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Customize panel */}
          <AnimatePresence>
            {customizing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 mb-5 border-t border-border pt-4">
                  {/* Necessary */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Necessary</p>
                      <p className="text-xs text-muted-foreground">Required for the website to function</p>
                    </div>
                    <Switch checked disabled />
                  </div>

                  {/* Analytics */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Analytics</p>
                      <p className="text-xs text-muted-foreground">Help us understand how you use the site</p>
                    </div>
                    <Switch
                      checked={consent.analytics}
                      onCheckedChange={(v) => setConsent((c) => ({ ...c, analytics: v }))}
                    />
                  </div>

                  {/* Marketing */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Marketing</p>
                      <p className="text-xs text-muted-foreground">Used for targeted communications</p>
                    </div>
                    <Switch
                      checked={consent.marketing}
                      onCheckedChange={(v) => setConsent((c) => ({ ...c, marketing: v }))}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            {customizing ? (
              <Button onClick={saveCustom} className="flex-1 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold text-xs">
                Save Preferences
              </Button>
            ) : (
              <>
                <Button onClick={acceptAll} className="flex-1 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-heading font-semibold text-xs">
                  Accept All
                </Button>
                <Button onClick={necessaryOnly} variant="outline" className="flex-1 rounded-lg font-heading font-semibold text-xs">
                  Necessary Only
                </Button>
                <Button
                  onClick={() => setCustomizing(true)}
                  variant="ghost"
                  className="flex-1 rounded-lg font-heading font-semibold text-xs gap-1.5"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Customize
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieBanner;
