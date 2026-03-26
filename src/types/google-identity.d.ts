interface GoogleOAuthError {
  type: "popup_failed_to_open" | "popup_closed" | "unknown";
}

interface GoogleCodeResponse {
  code?: string;
  scope?: string;
  state?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

interface GoogleCodeClient {
  requestCode: () => void;
}

interface GoogleCodeClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleCodeResponse) => void;
  error_callback?: (error: GoogleOAuthError) => void;
  ux_mode?: "popup" | "redirect";
  login_hint?: string;
  prompt?: string;
  select_account?: boolean;
  include_granted_scopes?: boolean;
}

interface GoogleIdentityServices {
  accounts: {
    oauth2: {
      initCodeClient: (config: GoogleCodeClientConfig) => GoogleCodeClient;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

export {};
