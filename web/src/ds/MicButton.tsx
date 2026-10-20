/* Live mic indicator (docs/motion.md 3.3 D8 adapted, moodboard Q1): the round mute button of the session dock.
 * While the mic is open, a blue --color-mic-live disc behind the button follows the real voice level:
 * opacity .35 + level × .65, scale .8 + level × .35 (calm: ≤ .35 scale change). A rAF loop reads `getLevel`
 * and writes the CSS variable --mic on the button — no React re-render per frame.
 * Muted: no disc, grey slashed mic icon, aria-pressed. Under reduced motion the disc still follows the level
 * (it is information), only without its transition. */
import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes } from "react";
import { Icon } from "./icons";
import { smoothLevel } from "./motion";
import s from "./MicButton.module.css";

export interface MicButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name, e.g. "Mute" / "Unmute". */
  label: string;
  muted: boolean;
  /** The mic is open (session live, voice input). */
  live: boolean;
  /** Current level 0..1 (read every animation frame). */
  getLevel?: () => number;
}

export const MicButton = forwardRef<HTMLButtonElement, MicButtonProps>(function MicButton(
  { label, muted, live, getLevel, className, type, ...rest },
  ref,
) {
  const own = useRef<HTMLButtonElement | null>(null);
  const active = live && !muted;
  const getLevelRef = useRef(getLevel);
  getLevelRef.current = getLevel;

  useEffect(() => {
    const el = own.current;
    if (!el) return;
    if (!active) {
      el.style.setProperty("--mic", "0");
      return;
    }
    let raf = 0;
    let level = 0;
    const tick = () => {
      level = smoothLevel(level, getLevelRef.current?.() ?? 0);
      el.style.setProperty("--mic", level.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <button
      ref={(el) => {
        own.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      type={type ?? "button"}
      className={`${s.mic} ${active ? s.live : ""} ${className ?? ""}`}
      aria-label={label}
      title={label}
      aria-pressed={muted}
      {...rest}
    >
      <span className={s.disc} aria-hidden="true" />
      <span className={s.face}><Icon name={muted ? "micOff" : "mic"} /></span>
    </button>
  );
});
