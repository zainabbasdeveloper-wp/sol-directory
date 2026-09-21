import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './Combobox.css';

export interface ComboItem {
  key: string;
  label: string;
  /** Right-aligned secondary text, e.g. a state code. */
  hint?: string;
}

interface ComboboxProps {
  label: string;
  value: string;
  onInputChange: (text: string) => void;
  items: ComboItem[];
  onSelect: (item: ComboItem) => void;
  placeholder?: string;
  icon?: ReactNode;
  loading?: boolean;
  /** Shown when the person has typed enough but nothing matches. */
  emptyText?: string;
  /** Show the list as soon as the field is focused, even before typing. */
  openOnFocus?: boolean;
  /** Called with the typed text when Enter is pressed with no list item highlighted. */
  onEnterText?: (text: string) => void;
  /**
   * Called when the list closes WITHOUT a choice being made (click away,
   * Escape, Tab) so the caller can revert uncommitted typed text. Not called
   * after a pick or an Enter-commit — those already updated the value, and
   * this callback would still see the old one.
   */
  onClose?: () => void;
  /** Renders a clear (×) button while there is text. */
  onClear?: () => void;
  autoFocus?: boolean;
}

/**
 * Accessible searchable select ("combobox with list autocomplete"):
 * type to filter, arrow keys + Enter to choose, Escape to close. Used
 * instead of long <select> lists so people can search for what they want.
 */
export default function Combobox({
  label, value, onInputChange, items, onSelect, placeholder, icon, loading, emptyText,
  openOnFocus = true, onEnterText, onClose, onClear, autoFocus,
}: ComboboxProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  function close() {
    setOpen(false);
    setActive(-1);
    onClose?.();
  }

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        if (open) close();
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // New results -> start from the top again.
  useEffect(() => { setActive(-1); }, [items]);

  // Keep the highlighted row visible when arrowing through a long list.
  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest' }); }, [active]);

  function pick(item: ComboItem) {
    onSelect(item);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && items[active]) { e.preventDefault(); pick(items[active]); }
      else if (onEnterText && value.trim()) { e.preventDefault(); onEnterText(value.trim()); setOpen(false); }
    } else if (e.key === 'Escape') {
      if (open) { e.stopPropagation(); close(); }
    } else if (e.key === 'Tab') {
      if (open) close();
    }
  }

  const showList = open && (items.length > 0 || (!!emptyText && !loading && value.trim().length >= 2));

  return (
    <div className="cbx" ref={wrapRef}>
      <label className="cbx-label" htmlFor={`${uid}-input`}>{label}</label>
      <div className="cbx-field">
        {icon && <span className="cbx-icon" aria-hidden="true">{icon}</span>}
        <input
          id={`${uid}-input`}
          className={`cbx-input${icon ? ' cbx-input-icon' : ''}`}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
          onChange={(e) => { onInputChange(e.target.value); setOpen(true); }}
          onFocus={() => { if (openOnFocus) setOpen(true); }}
          onKeyDown={onKeyDown}
        />
        {loading && <span className="cbx-spinner" role="status" aria-label="Searching" />}
        {!loading && onClear && value && (
          <button type="button" className="cbx-clear" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => { onClear(); }}>×</button>
        )}
      </div>

      {showList && (
        <ul id={listId} className="cbx-list" role="listbox" aria-label={label}>
          {items.map((item, i) => (
            <li
              key={item.key}
              id={`${uid}-opt-${i}`}
              ref={i === active ? activeRef : undefined}
              role="option"
              aria-selected={i === active}
              className={`cbx-option${i === active ? ' cbx-option-active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(item); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="cbx-option-label">{item.label}</span>
              {item.hint && <span className="cbx-option-hint">{item.hint}</span>}
            </li>
          ))}
          {items.length === 0 && <li className="cbx-empty" role="presentation">{emptyText}</li>}
        </ul>
      )}
    </div>
  );
}
