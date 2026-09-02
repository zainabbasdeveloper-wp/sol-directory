import { useEffect, useRef, useState } from 'react';
import { QUOTES } from '../data/providers';
import PhotoSlot from './PhotoSlot';
import './TestimonialCarousel.css';

export default function TestimonialCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), 7000);
    return () => clearInterval(timer.current);
  }, [paused]);

  const quote = QUOTES[index];

  return (
    <section
      className="testimonial-section"
      aria-roledescription="carousel"
      aria-label="What people say about SolDirectory"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="testimonial-inner">
        <div className="testimonial-photo">
          <PhotoSlot src="/images/reviews.jpg" alt="A SolDirectory participant" variant="care" />
        </div>
        <div>
          <span className="eyebrow">
            <span className="eyebrow-rule" />
            In their words
          </span>
          <div aria-live="polite" style={{ minHeight: 250 }}>
            <span aria-hidden="true" className="testimonial-mark">
              &ldquo;
            </span>
            <blockquote className="testimonial-quote">{quote.text}</blockquote>
            <div className="testimonial-attribution">
              <span className="attribution-rule" />
              <span>
                <strong>{quote.name}</strong>
                <br />
                <span className="testimonial-role">{quote.role}</span>
              </span>
            </div>
          </div>
          <div className="testimonial-controls">
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                aria-label="Previous testimonial"
                className="testimonial-nav-btn"
                onClick={() => setIndex((i) => (i - 1 + QUOTES.length) % QUOTES.length)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next testimonial"
                className="testimonial-nav-btn"
                onClick={() => setIndex((i) => (i + 1) % QUOTES.length)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <span className="testimonial-counter">
              {String(index + 1).padStart(2, '0')} / {String(QUOTES.length).padStart(2, '0')}
            </span>
            <span className="testimonial-track">
              <span className="testimonial-track-fill" style={{ width: `${((index + 1) / QUOTES.length) * 100}%` }} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
