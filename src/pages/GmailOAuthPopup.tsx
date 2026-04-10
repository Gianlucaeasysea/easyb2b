import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { loadGoogleIdentityScript } from "@/lib/gmailOAuth";
import { Button } from "@/components/ui/button";

type PopupState = "idle" | "loading" | "success" | "error";

const POPUP_SOURCE = "gmail-oauth-popup";
const GOOGLE_CLIENT_ID = "495157225927-5vl858qj6audau88lafer0d2hq69e0aj.apps.googleusercontent.com";
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

const GmailOAuthPopup = () => {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [state, setState] = useState<PopupState>("idle");
  const [message, setMessage] = useState("Clicca il pulsante per autorizzare Gmail.");
  const [isReady, setIsReady] = useState(false);

  const targetOrigin = useMemo(() => {
    const rawValue = searchParams.get("targetOrigin");
    if (!rawValue) return "*";
    try {
      return new URL(rawValue).origin;
    } catch {
      return "*";
    }
  }, [searchParams]);


  // Check if returning from Google redirect with authorization code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const stateParam = params.get("state");

    if (code) {
      // Returning from Google consent — parse targetOrigin from state
      let resolvedTargetOrigin = targetOrigin;
      if (stateParam) {
        try {
          const parsed = JSON.parse(stateParam);
          if (parsed.targetOrigin) resolvedTargetOrigin = parsed.targetOrigin;
        } catch { /* ignore */ }
      }

      setState("success");
      setMessage("Autorizzazione completata, torno al CRM...");

      window.opener?.postMessage(
        {
          source: POPUP_SOURCE,
          type: "success",
          code,
          redirectUri: window.location.origin,
        },
        resolvedTargetOrigin,
      );

      window.setTimeout(() => window.close(), 300);
      return undefined;
    }

    // No code — preload Google Identity Services script
    let isMounted = true;
    void loadGoogleIdentityScript()
      .then(() => { if (isMounted) setIsReady(true); })
      .catch((err) => {
        if (!isMounted) return;
        setState("error");
        setMessage(err instanceof Error ? err.message : "Impossibile preparare Google OAuth.");
      });
    return () => { isMounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuthorize = () => {
    if (!isReady) return;
    setState("loading");
    setMessage("Reindirizzamento a Google...");

    const loginHint = searchParams.get("loginHint") || "business@easysea.org";

    // Build the redirect URI pointing back to this same page
    const redirectUri = window.location.origin + window.location.pathname;

    // Encode targetOrigin in state so we can recover it on return
    const stateValue = JSON.stringify({ targetOrigin });

    try {
      const gw = window as Window & { google?: any };
      const client = gw.google.accounts.oauth2.initCodeClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GMAIL_SCOPES,
        ux_mode: "redirect",
        redirect_uri: redirectUri,
        state: stateValue,
        login_hint: loginHint,
        prompt: "consent",
        include_granted_scopes: true,
      });
      client.requestCode();
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Errore durante l'avvio dell'autorizzazione.");
    }
  };

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

          {(state === "idle" || state === "error") && (
            <Button onClick={handleAuthorize} className="mt-2 w-full" disabled={!isReady}>
              Autorizza Gmail
            </Button>
          )}
        </div>
      </section>
    </main>
  );
};

export default GmailOAuthPopup;