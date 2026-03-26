import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { requestGmailAuthorizationCodeOnCurrentOrigin } from "@/lib/gmailOAuth";

type PopupState = "loading" | "success" | "error";

const POPUP_SOURCE = "gmail-oauth-popup";

const GmailOAuthPopup = () => {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [state, setState] = useState<PopupState>("loading");
  const [message, setMessage] = useState("Sto aprendo il consenso Google...");

  useEffect(() => {
    let cancelled = false;

    const targetOrigin = (() => {
      const rawValue = searchParams.get("targetOrigin");

      if (!rawValue) return "*";

      try {
        return new URL(rawValue).origin;
      } catch {
        return "*";
      }
    })();

    const notifyParent = (payload: Record<string, string>) => {
      window.opener?.postMessage(
        {
          source: POPUP_SOURCE,
          ...payload,
        },
        targetOrigin,
      );
    };

    const run = async () => {
      try {
        const code = await requestGmailAuthorizationCodeOnCurrentOrigin(searchParams.get("loginHint") || undefined);

        if (cancelled) return;

        setState("success");
        setMessage("Autorizzazione completata, torno al CRM...");
        notifyParent({
          type: "success",
          code,
          redirectUri: window.location.origin,
        });

        window.setTimeout(() => window.close(), 150);
      } catch (error) {
        if (cancelled) return;

        const nextMessage = error instanceof Error ? error.message : "Errore durante l'autorizzazione Google.";

        setState("error");
        setMessage(nextMessage);
        notifyParent({
          type: "error",
          message: nextMessage,
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full border border-border bg-muted/60 p-4">
            {state === "loading" ? (
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            ) : state === "success" ? (
              <CheckCircle2 className="h-7 w-7 text-primary" />
            ) : (
              <MailWarning className="h-7 w-7 text-foreground" />
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Collegamento Gmail</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default GmailOAuthPopup;