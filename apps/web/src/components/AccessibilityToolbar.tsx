import { useEffect, useState } from 'react';
import './AccessibilityToolbar.css';

type Settings = {
  fontScale: number;
  grayscale: boolean;
  highContrast: boolean;
  negativeContrast: boolean;
  lightBackground: boolean;
  underlineLinks: boolean;
  reducedMotion: boolean;
};

const defaultSettings: Settings = {
  fontScale: 1,
  grayscale: false,
  highContrast: false,
  negativeContrast: false,
  lightBackground: false,
  underlineLinks: false,
  reducedMotion: false,
};

function clampFontScale(value: number) {
  return Math.min(1.55, Math.max(0.85, Number(value.toFixed(2))));
}

export default function AccessibilityToolbar() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const actionLabels = [
    {
      key: 'fontScale',
      label: 'Increase Text',
      sign: '+',
      action: () => update('fontScale', clampFontScale(settings.fontScale + 0.1)),
      active: false,
    },
    {
      key: 'fontScale',
      label: 'Decrease Text',
      sign: '−',
      action: () => update('fontScale', clampFontScale(settings.fontScale - 0.1)),
      active: false,
    },
    {
      key: 'grayscale',
      label: 'Grayscale',
      sign: '◫',
      action: () => update('grayscale', !settings.grayscale),
      active: settings.grayscale,
    },
    {
      key: 'highContrast',
      label: 'High Contrast',
      sign: '◉',
      action: () => update('highContrast', !settings.highContrast),
      active: settings.highContrast,
    },
    {
      key: 'negativeContrast',
      label: 'Negative Contrast',
      sign: '◌',
      action: () => update('negativeContrast', !settings.negativeContrast),
      active: settings.negativeContrast,
    },
    {
      key: 'lightBackground',
      label: 'Light Background',
      sign: '☼',
      action: () => update('lightBackground', !settings.lightBackground),
      active: settings.lightBackground,
    },
    {
      key: 'underlineLinks',
      label: 'Links Underline',
      sign: 'U',
      action: () => update('underlineLinks', !settings.underlineLinks),
      active: settings.underlineLinks,
    },
    {
      key: 'reducedMotion',
      label: 'Read',
      sign: 'A',
      action: () => update('reducedMotion', !settings.reducedMotion),
      active: settings.reducedMotion,
    },
  ];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accessibility-scale', String(settings.fontScale));

    document.body.classList.toggle('a11y-grayscale', settings.grayscale);
    document.body.classList.toggle('a11y-high-contrast', settings.highContrast);
    document.body.classList.toggle('a11y-negative-contrast', settings.negativeContrast);
    document.body.classList.toggle('a11y-light-background', settings.lightBackground);
    document.body.classList.toggle('a11y-underline-links', settings.underlineLinks);
    document.body.classList.toggle('a11y-reduced-motion', settings.reducedMotion);

    return () => {
      root.style.removeProperty('--accessibility-scale');
      document.body.classList.remove(
        'a11y-grayscale',
        'a11y-high-contrast',
        'a11y-negative-contrast',
        'a11y-light-background',
        'a11y-underline-links',
        'a11y-reduced-motion'
      );
    };
  }, [settings]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setSettings(defaultSettings);

  return (
    <div className={`accessibility-toolbar ${open ? 'is-open' : 'is-closed'}`}>
      <div className="accessibility-toolbar__toggle-wrap">
        <button
          type="button"
          className="accessibility-toolbar__toggle"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={open ? 'Close accessibility toolbar' : 'Open accessibility toolbar'}
        >
          <span aria-hidden="true">♿</span>
        </button>
      </div>

      {open && (
        <div className="accessibility-toolbar__panel" aria-label="Accessibility settings">
          <h2>Accessibility Toolbar</h2>

          {actionLabels.map(({ label, sign, action, active }) => (
            <button
              key={label}
              type="button"
              className={`accessibility-toolbar__item${label === 'Read' ? ' accessibility-toolbar__item--read' : ''}${active ? ' is-active' : ''}`}
              onClick={action}
              aria-pressed={active || undefined}
            >
              <span aria-hidden="true">{sign}</span>
              <span>{label}</span>
            </button>
          ))}

          <button type="button" className="accessibility-toolbar__reset" onClick={reset}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
