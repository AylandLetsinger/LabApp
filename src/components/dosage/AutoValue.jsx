/**
 * A value the calculator filled in, which flashes when it changes.
 *
 * Derived numbers move on their own as inputs elsewhere are edited, and a
 * number that changes silently in a table the user is not looking at is a
 * number they will read later without realising it moved. The flash is the
 * cheapest possible way to say "this one just changed".
 *
 * Remounting on every new value is what restarts the CSS animation; a class
 * toggle would need an effect and a timer to do the same job.
 */
export default function AutoValue({ value, children }) {
  return (
    <span key={String(value)} className="auto-value">
      {children}
    </span>
  );
}
