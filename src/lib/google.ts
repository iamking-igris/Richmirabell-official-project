declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdentityServices;
      };
    };
  }
}

interface GooglePromptMomentNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  getDismissedReason: () => string;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityServices {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    use_fedcm_for_prompt?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: (notification?: (notification: GooglePromptMomentNotification) => void) => void;
}

let scriptPromise: Promise<void> | null = null;
let initializedClientId: string | null = null;
let pendingCredential: {
  resolve: (credential: string) => void;
  reject: (error: Error) => void;
  timeoutId: number;
} | null = null;

export function googleClientId(): string | null {
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  return env?.VITE_GOOGLE_CLIENT_ID?.trim() || null;
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');

    const onReady = () => {
      if (window.google?.accounts?.id) resolve();
      else reject(new Error("Google sign-in is unavailable in this browser."));
    };

    if (existing) {
      existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not load Google sign-in.")),
        { once: true },
      );
      if (existing.dataset.loaded === "true" || window.google?.accounts?.id) onReady();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      onReady();
    };
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function promptError(notification: GooglePromptMomentNotification): Error | null {
  if (notification.isDismissedMoment()) {
    const reason = notification.getDismissedReason();
    if (reason === "credential_returned") return null;
    if (reason === "user_declined") {
      return new Error("Google sign-in was dismissed. You can try again or use email and password.");
    }
    if (reason === "cancel_called") {
      return new Error("Google sign-in was cancelled. Try again when ready.");
    }
  }

  if (notification.isNotDisplayed()) {
    const reason = notification.getNotDisplayedReason();
    if (reason === "suppressed_by_user" || reason === "browser_not_supported") {
      return new Error("Google sign-in is unavailable in this browser or has been disabled. Use email and password.");
    }
    if (reason === "unregistered_origin") {
      return new Error("Google sign-in is not allowed for this website origin.");
    }
    if (reason === "invalid_client" || reason === "missing_client_id") {
      return new Error("Google sign-in is not configured for this website.");
    }
  }

  if (notification.isSkippedMoment()) {
    const reason = notification.getSkippedReason();
    if (reason === "suppressed_by_user") {
      return new Error("Google sign-in is disabled. Use email and password or enable Google sign-in in browser settings.");
    }
  }

  return null;
}

export async function promptGoogleSignIn(): Promise<string> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new Error("Google sign-in is not configured for this website.");
  }

  if (pendingCredential) {
    throw new Error("Google sign-in is already in progress.");
  }

  await loadGoogleScript();
  const google = window.google?.accounts?.id;
  if (!google) throw new Error("Google sign-in is unavailable in this browser.");

  if (initializedClientId !== clientId) {
    google.initialize({
      client_id: clientId,
      callback: (response) => {
        const pending = pendingCredential;
        if (!pending) return;

        window.clearTimeout(pending.timeoutId);
        pendingCredential = null;

        if (!response.credential) {
          pending.reject(new Error("Google did not return a credential. Try again."));
          return;
        }
        pending.resolve(response.credential);
      },
      use_fedcm_for_prompt: true,
      cancel_on_tap_outside: true,
    });
    initializedClientId = clientId;
  }

  return new Promise<string>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      if (!pendingCredential) return;
      pendingCredential = null;
      reject(new Error("Google sign-in timed out or was not available. Try again or use email and password."));
    }, 60000);

    pendingCredential = { resolve, reject, timeoutId };

    google.prompt((notification) => {
      const pending = pendingCredential;
      if (!pending) return;

      const error = promptError(notification);
      if (!error) return;

      window.clearTimeout(pending.timeoutId);
      pendingCredential = null;
      pending.reject(error);
    });
  });
}
