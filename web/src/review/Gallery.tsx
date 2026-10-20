import { Component, useRef, type ErrorInfo, type ReactNode } from "react";
import { usePrefixIds } from "./prefixIds";
import s from "./review.module.css";
import { ENTRIES, ORDER, type GalleryEntry, type MetaLike, type StoryLike } from "./entries";

/** Error boundary per specimen: a broken story shows a readable message, the rest of the gallery keeps working. */
class SpecimenBoundary extends Component<{ id: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`[review] ${this.props.id}`, error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return <p className={s.gError} role="alert">Specimen “{this.props.id}” failed to render: {this.state.error.message}</p>;
  }
}

function Specimen({ meta, story }: { meta: MetaLike; story: StoryLike }) {
  const args = { ...meta.args, ...story.args };
  const render = story.render ?? meta.render;
  if (render) return <>{render(args, {})}</>;
  const C = meta.component;
  return C ? <C {...args} /> : null;
}

function SpecimenCard({ id, name, meta, story }: GalleryEntry["stories"][number]) {
  const stage = useRef<HTMLDivElement>(null);
  usePrefixIds(stage, id);
  return (
    <figure className={meta.parameters?.layout === "wide" ? `${s.gSpecimen} ${s.gWide}` : s.gSpecimen} data-review-section={id} data-comment-target data-review-id={id}>
      <figcaption className={s.gCaption}>{name}</figcaption>
      <div ref={stage} className={s.gStage}><SpecimenBoundary id={id}><Specimen meta={meta} story={story} /></SpecimenBoundary></div>
    </figure>
  );
}

export function Gallery({ theme }: { theme: "light" | "dark" }) {
  const sections = ORDER.filter((sec) => ENTRIES.some((e) => e.section === sec));
  return (
    <div className={s.gTheme} data-theme={theme} style={{ colorScheme: theme }}>
      {sections.map((sec) => (
        <section key={sec} className={s.gSection} aria-labelledby={`g-${theme}-${sec}`}>
          <h3 id={`g-${theme}-${sec}`} className={s.gSectionTitle}>{sec}</h3>
          {ENTRIES.filter((e) => e.section === sec).map((e) => (
            <article key={e.component} id={`c-${theme}-${e.component}`} className={s.gComponent}>
              <h4 className={s.gTitle}>{e.component}</h4>
              <div className={s.gStories}>
                {e.stories.map((st) => <SpecimenCard key={st.id} {...st} id={`${theme}/${st.id}`} />)}
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
