/* First-visit example (US-29): what you get after each question, with Sam Rivera's debrief. No marketing. */
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, InlineMark } from "../../../ds";
import { t } from "../../../i18n";
import type { InterviewModel } from "../types";
import s from "./parts.module.css";

export function ExamplePanel({ order = "content-first" }: { order?: InterviewModel["layerOrder"] }) {
  const navigate = useNavigate();
  const rows = [
    {
      layer: "content" as const,
      body: <>{t("home.example.content")}</>,
    },
    {
      layer: "language" as const,
      body: (
        <>
          “{t("home.example.langFrom")} <InlineMark kind="fix">{t("home.example.langWrong")}</InlineMark>” → “{t("home.example.langTo")}{" "}
          <InlineMark kind="fix">{t("home.example.langRight")}</InlineMark>”
          <span className={s.exampleLevel}> · {t("home.example.langLevel")}</span>
        </>
      ),
    },
    { layer: "delivery" as const, body: <>{t("home.example.delivery")}</> },
  ];
  if (order === "delivery-first") rows.reverse();
  return (
    <section className={s.example} aria-labelledby="home-example" data-review-id="Home/Example" data-review-section="Home · Example" data-comment-target>
      <h2 id="home-example" className={s.exampleTitle}>{t("home.example.title")}</h2>
      <Card tone="subtle" padding="md" className={s.exampleCard}>
        <Badge tone="outline">{t("home.example.label")} · {t("feedback.example.name")}</Badge>
        <ul className={s.exampleRows}>
          {rows.map((r) => (
            <li key={r.layer} className={s.exampleRow}>
              <Badge tone={r.layer} icon={r.layer}>{t(`feedback.layer.${r.layer}`)}</Badge>
              <span className={s.exampleText}>{r.body}</span>
            </li>
          ))}
        </ul>
      </Card>
      <div className={s.exampleFoot}>
        <Button variant="secondary" onClick={() => navigate("/sessions/example")}>{t("home.example.open")}</Button>
        <p className={s.helperTertiary}>{t("home.example.helper")}</p>
      </div>
    </section>
  );
}
