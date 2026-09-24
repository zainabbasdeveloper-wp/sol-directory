import { useEffect, useMemo, useRef, useState } from 'react';
import './ReadAloudButton.css';

type ReadAloudButtonProps = {
  selector?: string;
  label?: string;
  compact?: boolean;
};

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

function cleanTextFromTarget(selector: string) {
  const target = document.querySelector(selector) as HTMLElement | null;
  const root = target ?? document.body;
  const clone = root.cloneNode(true) as HTMLElement;

  clone.querySelectorAll(
    'header, nav, .public-header, .public-nav, .utility-bar, .public-footer, .accessibility-toolbar, .public-back-to-top, script, style, iframe, noscript'
  ).forEach((node) => node.remove());

  const text = (clone.innerText || root.textContent || '').replace(/\s+/g, ' ').trim();
  return text;
}

export default function ReadAloudButton({
  selector = 'main, [role="main"]',
  label = 'Listen',
  compact = false,
}: ReadAloudButtonProps) {
  const [open, setOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [speechText, setSpeechText] = useState('');
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const words = useMemo(() => speechText.split(/\s+/).filter(Boolean), [speechText]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeaking = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setActiveWordIndex(null);
    utteranceRef.current = null;
  };

  const startSpeaking = () => {
    if (!('speechSynthesis' in window)) return;

    const text = cleanTextFromTarget(selector);
    if (!text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((voice) => voice.lang.toLowerCase().includes('en-au')) ??
      voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ??
      null;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.lang = preferredVoice?.lang ?? 'en-AU';
    utterance.rate = speed;

    utterance.onstart = () => {
      setSpeechText(text);
      setOpen(true);
      setIsSpeaking(true);
      setActiveWordIndex(0);
    };

    utterance.onboundary = (event) => {
      if (event.name !== 'word') return;
      const wordsBefore = text.slice(0, Math.max(0, event.charIndex)).split(/\s+/).filter(Boolean).length;
      setActiveWordIndex(Math.max(0, wordsBefore - 1));
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setActiveWordIndex(null);
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setActiveWordIndex(null);
      utteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    startSpeaking();
  };

  return (
    <div className={`read-aloud ${compact ? 'read-aloud--compact' : ''}`}>
      <button
        type="button"
        className="read-aloud__button"
        onClick={toggleSpeech}
        aria-label={isSpeaking ? 'Stop reading page aloud' : label}
      >
        <span aria-hidden="true">🔊</span>
        {!compact && <span>{isSpeaking ? 'Stop' : label}</span>}
      </button>

      {open && (
        <div className="read-aloud__panel" role="dialog" aria-label="Read aloud controls">
          <div className="read-aloud__controls">
            <button type="button" className="read-aloud__mini" onClick={toggleSpeech}>
              {isSpeaking ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="read-aloud__mini" onClick={stopSpeaking}>
              Stop
            </button>
            <label className="read-aloud__speed">
              <span>Speed</span>
              <select
                aria-label="Speech speed"
                value={speed}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setSpeed(value);
                  if (utteranceRef.current && 'speechSynthesis' in window) {
                    utteranceRef.current.rate = value;
                  }
                }}
              >
                {SPEEDS.map((option) => (
                  <option key={option} value={option}>{option}x</option>
                ))}
              </select>
            </label>
          </div>

          <div className="read-aloud__text" aria-live="polite">
            {words.map((word, index) => (
              <span key={`${word}-${index}`} className={index === activeWordIndex ? 'is-active' : ''}>
                {word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
