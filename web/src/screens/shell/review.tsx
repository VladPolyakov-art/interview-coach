/* Sidebar on the review page (D57): the claude.ai-style sidebar of the AppShell, every state from props (no network).
 * Each state is a 1440 frame (the rail) and, for the drawer, a 375 frame. Fixture: docs/ia.md §6 (Alex Morgan). */
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AppShellView, type AppShellViewProps, type RecentState } from "../../components/AppShell";
import { Page } from "../../components/Page";
import { Card } from "../../ds";
import type { ReviewScreen, ReviewState } from "../../review/screens";

const RECENT: RecentState = {
  status: "ready",
  items: [
    { id: "s3", title: "Kestrel Pay · Senior Product Designer", track: "interview" },
    { id: "s2", title: "English practice", track: "english" },
    { id: "s1", title: "Lumen Health · Product Designer, Design Systems", track: "interview" },
    { id: "s0", title: "Northwind Logistics International · Senior Product Designer, Platform and Internal Tools", track: "interview" },
    { id: "s-1", title: "Interview practice", track: "interview" },
    { id: "s-2", title: "English · Talk about your work", track: "english" },
  ],
};

function Scene(props: Partial<AppShellViewProps>) {
  return (
    <MemoryRouter initialEntries={["/sessions/s1"]}>
      <AppShellView
        current={null}
        currentSessionId="s1"
        recent={RECENT}
        engine={{ name: "Ollama · qwen3:4b", status: "ready" }}
        onTrashSession={() => {}}
        {...props}
      >
        <Page layout="start" title="Good evening, Alex">
          <Card padding="md"><p>The page content takes the room the sidebar leaves: collapse it and this column grows.</p></Card>
        </Page>
      </AppShellView>
    </MemoryRouter>
  );
}

const state = (id: string, label: string, render: () => ReactNode, extra: Partial<ReviewState> = {}): ReviewState => ({
  id, label, render, mobile: false, ...extra,
});
const DOWN = { name: "Ollama · qwen3:4b", status: "notReady" as const };

export const shellReview: ReviewScreen = {
  id: "sidebar",
  title: "Sidebar",
  note: "D57: меню как у Claude (claude.ai). Сверху — знак и название, справа кнопка «Close sidebar»; ниже «New practice» (круглый плюс); «Recents» — чаты в одну строку, без дат, у английских тихое «EN»; снизу строка аккаунта открывает меню вверх (Settings, Appearance, Privacy and data). От 1024 сайдбар сворачивается в узкую полосу значков (запоминается), ниже 1024 он в выезжающей панели. Строки — заливка без линий.",
  states: [
    state("expanded", "Развёрнут", () => <Scene />, {
      dark: true,
      note: "Открытый чат выделен заливкой и весом 500. Названия обрезаются многоточием, дат и времени нет. Наведение — светлая заливка; полоса чатов прокручивается, верх и низ стоят на месте.",
    }),
    state("collapsed", "Свёрнут в полосу значков", () => <Scene collapsed />, {
      dark: true,
      note: "Остаются кнопка «Open sidebar», круглый плюс «New practice» и аватар; у каждого значка подсказка с названием. Ширина меняется за --duration-slow, при reduced motion мгновенно; контент справа занимает освободившееся место. Состояние запоминается в ic.railCollapsed.",
    }),
    state("account-menu", "Меню аккаунта", () => <Scene initialMenu="account" />, {
      dark: true,
      note: "Вся строка «You · Saved on this computer» — одна кнопка, меню открывается вверх: имя, Settings, Appearance, Privacy and data. Enter/Space открывают, стрелки двигают, Esc закрывает и возвращает фокус на строку. Выхода (Log out) нет: приложение локальное.",
    }),
    state("account-menu-collapsed", "Меню аккаунта в узкой полосе", () => <Scene collapsed initialMenu="account" />, {
      note: "То же меню от аватара, пока полоса свёрнута.",
    }),
    state("row-menu", "Меню «…» у чата", () => <Scene initialMenu="row" />, {
      note: "На наведении или фокусе у строки появляется «…» (на сенсорных экранах всегда). Пункты — то, что в приложении уже есть: Open и Move to Trash (с Undo в тосте, как в History). Rename не добавлен: сервер пока не принимает переименование.",
    }),
    state("engine-down", "Движок не готов", () => <Scene engine={DOWN} />, {
      note: "Строка «AI engine · Not ready» осталась над аккаунтом и показывается только пока движок не готов (ведёт в Settings → AI engine).",
    }),
    state("engine-down-collapsed", "Движок не готов, узкая полоса", () => <Scene collapsed engine={DOWN} />, {
      note: "В свёрнутой полосе — значок предупреждения над аватаром; слова «AI engine: Not ready» в подсказке и в имени кнопки (не только цвет).",
    }),
    state("loading", "Загрузка чатов", () => <Scene recent={{ status: "loading" }} engine={{ status: "checking" }} />, {
      note: "Скелетон вместо строк «Recents»; верх и низ на месте.",
    }),
    state("empty", "Чатов пока нет", () => <Scene recent={{ status: "ready", items: [] }} currentSessionId={undefined} />, {
      note: "«Your practice sessions will appear here.» под заголовком «Recents».",
    }),
    state("drawer", "Мобильная панель", () => <Scene drawerOpen onDrawerOpenChange={() => {}} />, {
      desktop: false,
      mobile: true,
      note: "Ниже 1024 сайдбар живёт в левой панели и всегда развёрнут; кнопка «Close sidebar» закрывает панель, выбор в меню или ссылка тоже.",
    }),
  ],
};
