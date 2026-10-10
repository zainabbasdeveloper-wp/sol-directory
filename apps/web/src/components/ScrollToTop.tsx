import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Opening another page starts at its top, wherever the last one was scrolled to. Filters and paging that only change
 * the query string stay where they are, a #section link still goes to its section, and Back/Forward keep the
 * browser's own restored position.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const type = useNavigationType();

  useEffect(() => {
    if (type === 'POP' || hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash, type]);

  return null;
}
