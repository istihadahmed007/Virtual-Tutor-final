import { useState, useEffect } from "react";

/**
 * Reusable Typewriter hook
 * Reveals text character-by-character with customizable delay and speed.
 */
export function useTypewriter(text: string, speed: number = 38, startDelay: number = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    setDisplayed("");
    setDone(false);

    timeoutId = setTimeout(() => {
      let currentIndex = 0;
      intervalId = setInterval(() => {
        if (currentIndex < text.length) {
          currentIndex++;
          setDisplayed(text.slice(0, currentIndex));
        } else {
          if (intervalId) clearInterval(intervalId);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}
