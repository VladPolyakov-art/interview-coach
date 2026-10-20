/* 3-dot loader (v1 L5 / C4): grey dots wave while something is on its way. Static under reduced motion,
 * paused while the user speaks (.motion-loop). The label is for screen readers unless `showLabel`. */
import s from "./Dots.module.css";

export interface DotsProps {
  label?: string;
  showLabel?: boolean;
}

export function Dots({ label, showLabel }: DotsProps) {
  return (
    <span className={s.wrap}>
      <span className={`${s.dots} motion-loop`} aria-hidden="true"><i /><i /><i /></span>
      {label ? <span className={showLabel ? s.label : "visually-hidden"}>{label}</span> : null}
    </span>
  );
}
