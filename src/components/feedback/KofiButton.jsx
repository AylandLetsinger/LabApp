import { useEffect, useRef, useState } from 'react';

/** Ko-fi's own widget script, and the button it is configured to draw. */
const WIDGET_SRC = 'https://storage.ko-fi.com/cdn/widget/Widget_2.js';
const BUTTON_TEXT = 'Support TheLabApp';
const BUTTON_COLOUR = '#080808';
const KOFI_CODE = 'V1T624YCU3';

/**
 * One shared load, however many times this component mounts.
 *
 * A promise rather than a boolean, so two mounts in the same tick both wait on
 * the same script rather than the second appending a duplicate.
 */
let scriptPromise;

function loadWidget() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.kofiwidget2) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = WIDGET_SRC;
    el.async = true;
    el.onload = () => resolve();
    // A blocked script is not an error worth showing anyone — the plain link
    // below the button already goes to the same place.
    el.onerror = () => reject(new Error('Ko-fi widget did not load'));
    document.head.appendChild(el);
  });
  return scriptPromise;
}

/**
 * Ko-fi's support button, on every page.
 *
 * WHY NOT THE SNIPPET AS GIVEN
 * ----------------------------
 * Ko-fi's own instructions end in `kofiwidget2.draw()`, and draw() is
 * implemented with `document.writeln`. In a plain HTML page that writes the
 * button where the script tag sits. Called after the document has finished
 * loading — which is the only time it can be called in a single-page app —
 * document.write REPLACES the entire document. The app would blank itself.
 *
 * The same script exposes getHTML(), which returns exactly the same markup and
 * hands it back rather than writing it. That is what is used here.
 *
 * WHAT THIS COSTS
 * ---------------
 * Two third-party origins on every page: storage.ko-fi.com for the script and
 * the cup image, and fonts.googleapis.com, because the returned markup asks
 * for Quicksand. Neither is needed by any calculator. The Support page says so
 * rather than leaving the site's earlier claim about tracking standing.
 */
export default function KofiButton() {
  const holder = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadWidget()
      .then(() => {
        if (cancelled || !holder.current || !window.kofiwidget2) return;
        window.kofiwidget2.init(BUTTON_TEXT, BUTTON_COLOUR, KOFI_CODE);
        // Style and link elements injected this way do apply; script elements
        // would not, and the returned markup contains none.
        holder.current.innerHTML = window.kofiwidget2.getHTML();
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing is rendered in place of a blocked widget: the footer already links
  // to Support, and an error message about a donation button helps no one.
  if (failed) return null;

  return <div ref={holder} className="no-print" />;
}
