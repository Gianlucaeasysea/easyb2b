const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

// Public OAuth client IDs are safe to ship in frontend code.
const GOOGLE_CLIENT_ID = "495157225927-5vl858qj6audau88lafer0d2hq69e0aj.apps.googleusercontent.com";
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

let googleIdentityScriptPromise: Promise<void> | null = null;

function getPopupErrorMessage(error: GoogleOAuthError) {
  switch (error.type) {
    case "popup_failed_to_open":
      return "Il popup di Google non si è aperto. Controlla il blocco popup del browser.";
    case "popup_closed":
      return "Il popup di Google è stato chiuso prima di completare l'autorizzazione.";
    default:
      return "Errore sconosciuto durante l'apertura del popup Google.";
  }
}

export async function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) {
    return;
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`);

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Impossibile caricare Google Identity Services.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Impossibile caricare Google Identity Services."));
      document.head.appendChild(script);
    });
  }

  await googleIdentityScriptPromise;

  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services non è disponibile nella pagina.");
  }
}

export async function requestGmailAuthorizationCode(loginHint = "business@easysea.org") {
  await loadGoogleIdentityScript();

  return await new Promise<string>((resolve, reject) => {
    const googleOauth = window.google?.accounts?.oauth2;

    if (!googleOauth) {
      reject(new Error("Google Identity Services non è disponibile."));
      return;
    }

    const client = googleOauth.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GMAIL_READONLY_SCOPE,
      ux_mode: "popup",
      login_hint: loginHint,
      prompt: "consent",
      include_granted_scopes: true,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        if (!response.code) {
          reject(new Error("Google non ha restituito un authorization code valido."));
          return;
        }

        resolve(response.code);
      },
      error_callback: (error) => {
        reject(new Error(getPopupErrorMessage(error)));
      },
    });

    client.requestCode();
  });
}
