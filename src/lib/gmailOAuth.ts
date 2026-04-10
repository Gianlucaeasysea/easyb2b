type GoogleOAuthError = {
  type: "popup_failed_to_open" | "popup_closed" | "unknown";
};

type GmailOAuthPopupMessage =
  | {
      source: "gmail-oauth-popup";
      type: "success";
      code: string;
      redirectUri: string;
    }
  | {
      source: "gmail-oauth-popup";
      type: "error";
      message: string;
    };

export type GmailAuthorizationCodeResult = {
  code: string;
  redirectUri: string;
};

type GoogleCodeResponse = {
  code?: string;
  scope?: string;
  state?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
};

type GoogleCodeClient = {
  requestCode: () => void;
};

type GoogleCodeClientConfig = {
  client_id: string;
  scope: string;
  callback: (response: GoogleCodeResponse) => void;
  error_callback?: (error: GoogleOAuthError) => void;
  ux_mode?: "popup" | "redirect";
  login_hint?: string;
  prompt?: string;
  select_account?: boolean;
  include_granted_scopes?: boolean;
};

type GoogleIdentityServices = {
  accounts: {
    oauth2: {
      initCodeClient: (config: GoogleCodeClientConfig) => GoogleCodeClient;
    };
  };
};

const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = "495157225927-5vl858qj6audau88lafer0d2hq69e0aj.apps.googleusercontent.com";
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");
export const GMAIL_POPUP_BRIDGE_URL = "https://b2b.easysea.org/oauth/gmail-popup";

const OAUTH_STATE_KEY = "gmail_oauth_state";

let googleIdentityScriptPromise: Promise<void> | null = null;

/**
 * Generates a cryptographically random state nonce for CSRF protection
 * and stores it in sessionStorage for later validation.
 */
function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const state = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  sessionStorage.setItem(OAUTH_STATE_KEY, state);
  return state;
}

/**
 * Validates the state parameter returned from the OAuth flow.
 * Consumes the stored state (one-time use).
 * Returns true if valid, false otherwise.
 */
function validateOAuthState(returnedState: string | undefined | null): boolean {
  const savedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_KEY);

  if (!savedState || !returnedState) return false;
  return savedState === returnedState;
}

function createGmailAuthorizationCodeRequest(loginHint = "business@easysea.org") {
  return new Promise<string>((resolve, reject) => {
    const googleWindow = window as Window & { google?: GoogleIdentityServices };
    const googleOauth = googleWindow.google?.accounts?.oauth2;

    if (!googleOauth) {
      reject(new Error("Google Identity Services non è disponibile."));
      return;
    }

    const client = googleOauth.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GMAIL_SCOPES,
      ux_mode: "popup",
      ...(loginHint ? { login_hint: loginHint } : {}),
      prompt: "select_account consent",
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
  const googleWindow = window as Window & { google?: GoogleIdentityServices };

  if (googleWindow.google?.accounts?.oauth2) {
    return;
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`);

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Identity Services."));
      document.head.appendChild(script);
    });
  }

  await googleIdentityScriptPromise;

  if (!googleWindow.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services non è disponibile nella pagina.");
  }
}

function getPopupFeatures() {
  const width = 560;
  const height = 720;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

  return [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");
}

function isPopupMessage(value: unknown): value is GmailOAuthPopupMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Partial<GmailOAuthPopupMessage>;
  return message.source === "gmail-oauth-popup" && (message.type === "success" || message.type === "error");
}

function getPopupBridgeOrigin() {
  return new URL(GMAIL_POPUP_BRIDGE_URL).origin;
}

export async function requestGmailAuthorizationCodeOnCurrentOrigin(loginHint = "business@easysea.org") {
  const googleWindow = window as Window & { google?: GoogleIdentityServices };

  if (googleWindow.google?.accounts?.oauth2) {
    return createGmailAuthorizationCodeRequest(loginHint);
  }

  await loadGoogleIdentityScript();
  return createGmailAuthorizationCodeRequest(loginHint);
}

function requestGmailAuthorizationCodeFromPublishedBridge(loginHint: string) {
  return new Promise<GmailAuthorizationCodeResult>((resolve, reject) => {
    const state = generateOAuthState();
    const popupBridgeUrl = new URL(GMAIL_POPUP_BRIDGE_URL);
    popupBridgeUrl.searchParams.set("targetOrigin", window.location.origin);
    popupBridgeUrl.searchParams.set("loginHint", loginHint);
    popupBridgeUrl.searchParams.set("oauthState", state);

    const popup = window.open(popupBridgeUrl.toString(), "gmail-oauth-popup", getPopupFeatures());

    if (!popup) {
      reject(new Error(getPopupErrorMessage({ type: "popup_failed_to_open" })));
      return;
    }

    const allowedOrigin = getPopupBridgeOrigin();

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      window.clearInterval(closeWatcher);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== allowedOrigin || !isPopupMessage(event.data)) {
        return;
      }

      cleanup();

      if (!popup.closed) {
        popup.close();
      }

      if (event.data.type === "success") {
        // Validate CSRF state
        if (!validateOAuthState(event.data.state)) {
          reject(new Error("OAuth state mismatch — possible CSRF attack. Please retry."));
          return;
        }
        resolve({
          code: event.data.code,
          redirectUri: event.data.redirectUri,
        });
        return;
      }

      reject(new Error(event.data.message || "Errore durante l'autorizzazione Google."));
    };

    let closedCount = 0;
    const closeWatcher = window.setInterval(() => {
      if (!popup.closed) {
        closedCount = 0;
        return;
      }
      closedCount++;
      // Wait for 3 consecutive checks (1.5s) to avoid false positives during redirects
      if (closedCount < 3) return;
      cleanup();
      reject(new Error(getPopupErrorMessage({ type: "popup_closed" })));
    }, 500);

    window.addEventListener("message", handleMessage);
  });
}

export async function requestGmailAuthorizationCode(loginHint = "business@easysea.org"): Promise<GmailAuthorizationCodeResult> {
  if (window.location.origin === getPopupBridgeOrigin()) {
    const code = await requestGmailAuthorizationCodeOnCurrentOrigin(loginHint);
    return {
      code,
      redirectUri: window.location.origin,
    };
  }

  return requestGmailAuthorizationCodeFromPublishedBridge(loginHint);
}
