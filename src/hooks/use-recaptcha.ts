import { useCallback, useEffect, useRef } from "react";

const RECAPTCHA_SCRIPT_ID = "recaptcha-v3-script";
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;

export function useRecaptcha() {
  const isLoaded = useRef(false);

  useEffect(() => {
    if (!SITE_KEY || isLoaded.current) return;
    if (typeof document === "undefined") return;

    const existing = document.getElementById(RECAPTCHA_SCRIPT_ID);
    if (existing) {
      isLoaded.current = true;
      return;
    }

    const script = document.createElement("script");
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    isLoaded.current = true;
  }, []);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!SITE_KEY) {
        // reCAPTCHA not configured — return null to indicate skip
        return null;
      }

      if (typeof window === "undefined" || !window.grecaptcha) {
        // Script not loaded yet — return null to skip gracefully
        return null;
      }

      return new Promise<string | null>((resolve) => {
        try {
          window.grecaptcha!.ready(() => {
            window.grecaptcha!.execute(SITE_KEY, { action }).then(
              (token) => {
                resolve(token || null);
              },
              () => {
                // reCAPTCHA failed — skip rather than block auth
                resolve(null);
              },
            );
          });
        } catch {
          resolve(null);
        }
      });
    },
    [],
  );

  return { executeRecaptcha, isConfigured: !!SITE_KEY };
}
