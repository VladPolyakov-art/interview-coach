import { Frame } from "./Frame";
import { Gallery } from "./Gallery";
import { ENTRIES } from "./entries";
import { CommentButton } from "./CommentButton";
import { DECISIONS } from "./decisions";
import { REVIEW_SCREENS, type ReviewScreen, type ReviewState } from "./screens";
import s from "./review.module.css";

/* Review viewport sizes (not design values): desktop and phone from ds/screens/*.md. */
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

function StateBlock({ screen, state }: { screen: ReviewScreen; state: ReviewState }) {
  const key = `${screen.id}/${state.id}`;
  const desktop = state.desktop ?? true;
  const mobile = state.mobile ?? true;
  const themes: ("light" | "dark")[] = state.dark ? ["light", "dark"] : ["light"];
  return (
    <div className={s.state} id={`${screen.id}-${state.id}`}>
      <h3 className={s.h3}>{state.label}</h3>
      {state.note && <p className={s.note}>{state.note}</p>}
      {desktop && themes.map((th) => (
        <div key={th} className={s.frameWrap} data-review-section={`${key}@1440${th === "dark" ? " dark" : ""}`} data-comment-target data-review-id={`${key}@1440-${th}`}>
          <span className={s.frameLabel}>1440 · {th === "dark" ? "тёмная" : "светлая"}{state.tall ? " · во всю высоту" : ""}</span>
          <Frame {...DESKTOP} tall={state.tall} theme={th} prefix={`${key}@1440-${th}`}>{state.render()}</Frame>
        </div>
      ))}
      {mobile && (
        <div className={s.phones}>
          {themes.map((th) => (
            <div key={th} className={s.phone} data-review-section={`${key}@375${th === "dark" ? " dark" : ""}`} data-comment-target data-review-id={`${key}@375-${th}`}>
              <span className={s.frameLabel}>375 · {th === "dark" ? "тёмная" : "светлая"}</span>
              <Frame {...MOBILE} tall={state.tall} theme={th} prefix={`${key}@375-${th}`}>{state.render()}</Frame>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewPage() {
  const specimens = ENTRIES.reduce((n, e) => n + e.stories.length, 0);
  return (
    <div className={s.page}>
      <header className={s.intro}>
        <p className={s.kicker}>Interview Coach · дизайн в коде · 20 окт 2026</p>
        <h1 className={s.h1}>Дизайн-ревью: ключевые экраны</h1>
        <p className={s.lead}>
          Это не макет, а живой код: экраны собраны на React из токенов и компонентов дизайн-системы (направление A, «Тихий чат, одна живая вещь»).
          Данные вымышленные. Интерфейс продукта — на английском.
        </p>
        <section className={s.v2} aria-labelledby="h-v2" data-review-id="Intro/v2" data-review-section="Версия 2" data-comment-target>
          <h2 id="h-v2" className={s.v2Title}>Версия 2 — по вашим комментариям к v1</h2>
          <ul className={s.v2List}>
            <li><strong>a.</strong> Кнопка отправки «уезжала» из поля — теперь она внутри поля, справа.</li>
            <li><strong>b.</strong> На главной больше нет круга: только приветствие текстом.</li>
            <li><strong>c.</strong> Всё управление сессией — в одном «островке» внизу; верхней панели и дока нет, разбор открывается из островка.</li>
            <li><strong>d.</strong> Пункты левого меню стоят плотнее.</li>
            <li><strong>e.</strong> Главная разгружена: одно поле и до трёх подсказок, а настройки (вакансия, раунд, пожелания) — в коротком чате с Майком, который заканчивается карточкой плана.</li>
          </ul>
          <p className={s.note}>Орб в сессии пока прежний: его новый вид подбираем на отдельном мудборде.</p>
        </section>
        <p className={s.how}>
          <strong>Как комментировать:</strong> наведите курсор на блок — справа вверху появится кнопка с его названием. Нажмите её и оставьте комментарий прямо к этому элементу.
          Комментарий к экрану целиком — кнопка над рамкой. Если кнопок нет, комментарии в этом просмотре недоступны: напишите правки сообщением и назовите блок.
        </p>
        <nav className={s.toc} aria-label="Разделы">
          {REVIEW_SCREENS.map((sc) => <a key={sc.id} href={`#${sc.id}`}>{sc.title}</a>)}
          <a href="#decisions">Решения по умолчанию · {DECISIONS.length}</a>
          <a href="#components">Компоненты · {ENTRIES.length} / {specimens}</a>
          <a href="#components-dark">Компоненты · тёмная</a>
        </nav>
      </header>

      <section id="decisions" className={s.section} aria-labelledby="h-decisions">
        <h2 id="h-decisions" className={s.h2}>Решения по умолчанию</h2>
        <p className={s.note}>Экраны собраны с этими ответами. Если не согласен — оставь комментарий на строке, переделаю.</p>
        <ol className={s.decisions}>
          {DECISIONS.map((d) => (
            <li key={d.id} className={s.decision} data-review-section={`Решение · ${d.question}`} data-comment-target data-review-id={`Decision/${d.id}`}>
              <span className={s.decisionScreen}>{d.screen}</span>
              <span className={s.decisionQ}>{d.question}</span>
              <span className={s.decisionA}>{d.chosen}{d.alt && <span className={s.decisionAlt}> · иначе: {d.alt}</span>}</span>
            </li>
          ))}
        </ol>
      </section>

      {REVIEW_SCREENS.map((sc) => (
        <section key={sc.id} id={sc.id} className={s.section} aria-labelledby={`h-${sc.id}`}>
          <h2 id={`h-${sc.id}`} className={s.h2}>{sc.title}</h2>
          <p className={s.note}>{sc.note}</p>
          {sc.states.map((st) => <StateBlock key={st.id} screen={sc} state={st} />)}
        </section>
      ))}

      <section id="components" className={s.section} aria-labelledby="h-components">
        <h2 id="h-components" className={s.h2}>Компоненты · светлая</h2>
        <p className={s.note}>Все компоненты во всех вариантах и состояниях. Те же образцы — в Storybook.</p>
        <Gallery theme="light" />
      </section>
      <section id="components-dark" className={s.section} aria-labelledby="h-components-dark">
        <h2 id="h-components-dark" className={s.h2}>Компоненты · тёмная</h2>
        <Gallery theme="dark" />
      </section>

      <CommentButton />
    </div>
  );
}
