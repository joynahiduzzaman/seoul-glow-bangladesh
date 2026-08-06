"use client";

import { useId, useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Password input with a show/hide toggle.
 *
 * Only the `type` attribute changes, so the value, cursor position, selection
 * and browser autofill association all survive the toggle — swapping the element
 * out instead would clear what someone had typed, which is the usual way this
 * gets built wrong.
 *
 * The button is `type="button"` on purpose: inside a form, the default
 * `type="submit"` would attempt a sign-in every time someone peeked at what they
 * had typed.
 *
 * `className` is passed through rather than fixed here because this project uses
 * three different input styles (`.field`, and two bespoke ones in ProfileForm
 * and SettingsPage). The wrapper only adds right padding, so the toggle never
 * sits on top of the text.
 */
interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Applied to the input, exactly as it was before this component existed. */
  className?: string;
  /** Names the field for assistive tech, e.g. "Current password". */
  label?: string;
}

const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { className = "", label, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const describedBy = `${inputId}-visibility`;

  const what = label ? label.toLowerCase() : "password";

  return (
    <div className="relative">
      <input
        {...props}
        ref={ref}
        id={props.id ?? inputId}
        type={visible ? "text" : "password"}
        // Room for the toggle, so a long password never runs underneath it.
        className={`${className} pr-11`}
        aria-describedby={describedBy}
      />

      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Conveys both the action and the current state: a screen reader user
        // needs to know whether their password is currently exposed on screen.
        aria-label={visible ? `Hide ${what}` : `Show ${what}`}
        aria-pressed={visible}
        // -translate-y-1/2 with top-1/2 keeps it centred whatever the field's
        // height, which differs between the three input styles in use.
        className="absolute right-0 top-1/2 flex h-9 w-11 -translate-y-1/2 items-center justify-center rounded-r-xl text-ink/40 transition-colors hover:text-ink/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold/40"
      >
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>

      {/* Announced on toggle, so the change is perceivable without sight. */}
      <span id={describedBy} className="sr-only" aria-live="polite">
        {visible ? `${label || "Password"} is visible` : `${label || "Password"} is hidden`}
      </span>
    </div>
  );
});

export default PasswordField;
