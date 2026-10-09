import { useEffect, useRef, useState } from 'react';

interface CounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  format?: boolean; // thousands separator
}

/**
 * Counts up to `value` the first time it scrolls into view, then keeps following `value`: when the number changes
 * (a live refresh, a different period) it animates from what is on screen to the new figure.
 */
export default function Counter({ value, prefix = '', suffix = '', duration = 1400, format = true }: CounterProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useRef(false);
  const shown = useRef(0);
  const target = useRef(value);
  const frame = useRef(0);

  function animateTo(to: number, ms: number) {
    cancelAnimationFrame(frame.current);
    const from = shown.current;
    if (from === to) return;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / ms, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      shown.current = Math.round(from + (to - from) * eased);
      setDisplay(shown.current);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !visible.current) {
          visible.current = true;
          animateTo(target.current, duration);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => { observer.disconnect(); cancelAnimationFrame(frame.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  useEffect(() => {
    target.current = value;
    // Before the first reveal the observer above does the counting; afterwards follow every change.
    if (visible.current) animateTo(value, Math.min(duration, 700));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const text = format ? display.toLocaleString('en-AU') : String(display);

  return (
    <span ref={ref}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
