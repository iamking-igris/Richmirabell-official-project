declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function googleClientId(): string | null {
  const env = typeof import.meta !== "undefined" ? import.meta.env : undefined;
  return env?.VITE_GOOGLE_CLIENT_ID?.trim() || null;
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Google sign-in.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export async function promptGoogleSignIn(): Promise<string> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new Error(
      "Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID on the backend.",
    );
  }
  await loadGoogleScript();
  const google = window.google?.accounts?.id;
  if (!google) throw new Error("Google sign-in is unavailable in this browser.");

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (credential?: string) => {
      if (settled) return;
      settled = true;
      if (credential) resolve(credential);
      else reject(new Error("Google did not return a credential. Try again."));
    };
    google.initialize({
      client_id: clientId,
      callback: (response) => finish(response.credential),
    });
    google.prompt();
    window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Google sign-in was dismissed or is unavailable. Use email and password instead."));
      }
    }, 60000);
  });
}
