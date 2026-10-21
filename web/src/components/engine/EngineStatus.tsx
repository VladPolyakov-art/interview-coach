import { Badge } from "../../ds";
import { t, tMaybe } from "../../i18n";
import type { EngineInfo } from "../../lib/types";

function statusTone(e: EngineInfo) {
  if (e.status.ready) return "success" as const;
  if (e.status.code === "not_configured" || e.status.code === "disconnected") return "neutral" as const;
  return "warning" as const;
}

/** Full status badge (Ready, Not running, Key rejected…); used in the connection view and the summary card. */
export function EngineStatus({ engine }: { engine: EngineInfo }) {
  return (
    <Badge tone={statusTone(engine)} icon={engine.status.ready ? "check" : engine.status.code === "not_configured" || engine.status.code === "disconnected" ? undefined : "alert"}>
      {tMaybe(`engines.status.${engine.status.code}`, engine.status.code)}
    </Badge>
  );
}

/** The one quiet word in a chooser row: "Ready", "Disconnected" (D84) or "Needs setup" (no warning tones in the list). */
export const engineStatusWord = (e: EngineInfo) => (e.status.ready ? t("engines.status.ready")
  : e.status.code === "disconnected" ? t("engines.status.disconnected") : t("engines.status.not_configured"));
