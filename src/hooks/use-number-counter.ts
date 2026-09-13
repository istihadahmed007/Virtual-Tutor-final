import { useState, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface UseCounterOptions {
  duration?: number; // duration in ms
  decimals?: number;
  startOnView?: boolean;
}

export function useNumberCounter(
  targetValue: number,
  options: UseCounterOptions = {}
) {
  const { duration = 1200, decimals = 0 } = options;
  const [currentValue, setCurrentValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shouldReduceMotion) {
      setCurrentValue(targetValue);
      setHasAnimated(true);
      return;
    }

    const node = elementRef.current;
    if (!node) {
      setCurrentValue(targetValue);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          const startTime = performance.now();
          const startNum = 0;

          const updateCounter = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const val = startNum + (targetValue - startNum) * easeProgress;

            setCurrentValue(Number(val.toFixed(decimals)));

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              setCurrentValue(targetValue);
            }
          };

          requestAnimationFrame(updateCounter);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [targetValue, duration, decimals, hasAnimated, shouldReduceMotion]);

  return { value: currentValue, ref: elementRef };
}
