/* D68: the product's wordmark — the name "Vukoli" set lowercase in the UI font, no symbol (owner: «только слово»,
 * a simple placeholder until a real logo). The favicon is its first letter (public/favicon.svg). */
import { t } from "../i18n";
import s from "./Wordmark.module.css";

export function Wordmark({ className }: { className?: string }) {
  return <span className={`${s.wordmark} ${className ?? ""}`}>{t("app.name")}</span>;
}
