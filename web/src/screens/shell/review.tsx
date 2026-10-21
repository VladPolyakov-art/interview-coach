/* Sidebar on the review page (D57): the claude.ai-style sidebar of the AppShell, every state from props (no network).
 * Each state is a 1440 frame (the rail) and, for the drawer, a 375 frame. Fixture: docs/ia.md §6 (Alex Morgan). */
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShellView, type AppShellViewProps, type RecentState } from "../../components/AppShell";
import { Page } from "../../components/Page";
import { SettingsScreen } from "../Settings";
import { Card } from "../../ds";
import { EngineFixture, makeEngines } from "../../components/engine/fixtures";
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

function Scene({ at = "/sessions/s1", page, ...props }: Partial<AppShellViewProps> & { at?: string; page?: ReactNode }) {
  return (
    <MemoryRouter initialEntries={[at]}>
      <AppShellView
        current={null}
        currentSessionId="s1"
        recent={RECENT}
        engine={{ name: "Ollama · qwen3:4b", status: "ready" }}
        onTrashSession={() => {}}
        {...props}
      >
        {page ?? (
          <Page layout="start" title="Good evening, Alex">
            <Card padding="md"><p>The page content takes the room the sidebar leaves: collapse it and this column grows.</p></Card>
          </Page>
        )}
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
  note: "D57: меню как у Claude (claude.ai). Сверху — знак и название, справа кнопка «Close sidebar»; ниже «New practice» (серый круг с плюсом, как у Claude, D59); «Recents» — чаты в одну строку, без дат, у английских тихое «EN»; снизу строка аккаунта «You · Local» с шевроном открывает меню вверх (Settings, Theme, Privacy and data, Help & what's free). D78: интерфейс скруглённый — строка аккаунта и строки меню капсулами; в свёрнутой полосе вместо кнопки «развернуть» — знак Vukoli, при наведении он меняется на значок «Open sidebar». От 1024 сайдбар сворачивается в узкую полосу значков (запоминается), ниже 1024 он в выезжающей панели. Строки — заливка без линий. D59: сайдбар на шаг светлее рабочей области (тёмная тема: #141414 и #0A0A0A); чаты появляются без анимации.",
  states: [
    state("expanded", "Развёрнут", () => <Scene />, {
      dark: true,
      note: "Открытый чат выделен заливкой и весом 500. Названия обрезаются многоточием, дат и времени нет. Наведение — светлая заливка; полоса чатов прокручивается, верх и низ стоят на месте.",
    }),
    state("collapsed", "Свёрнут в полосу значков", () => <Scene collapsed />, {
      dark: true,
      note: "D78: сверху знак Vukoli (круг с буквой v); наведение или фокус меняют его на значок «Open sidebar», клик разворачивает. Остаются круглый плюс «New practice» и аватар; у каждого значка подсказка с названием. Ширина меняется за --duration-slow, при reduced motion мгновенно; контент справа занимает освободившееся место. Состояние запоминается в ic.railCollapsed.",
    }),
    state("account-menu", "Меню аккаунта", () => <Scene initialMenu="account" />, {
      dark: true,
      note: "Вся строка «You · Local» с шевроном (D59) — одна кнопка, меню открывается вверх (шеврон переворачивается), в шапке меню — «Saved on this computer»: имя, Settings, строка Theme с тремя круглыми кнопками System / Light / Dark (D78: тема переключается прямо в меню, меню не закрывается), Privacy and data, Help & what's free (D58). Enter/Space открывают, стрелки двигают, Esc закрывает и возвращает фокус на строку. Выхода (Log out) нет: приложение локальное.",
    }),
    state("about", "Help & what's free → Settings · About", () => (
      <Scene at="/settings/about" current="settings" currentSessionId={undefined}
        page={<Routes><Route path="/settings/:section" element={<SettingsScreen />} /></Routes>} />
    ), {
      dark: true,
      note: "D58: пункт «Help & what's free» в меню аккаунта и ссылка «What's free» на Home ведут сюда (/settings/about#free); с D76 — в попапе настроек. Одна таблица US-30: бесплатно навсегда — практика, английский, подготовка по CV и вакансии, банк вопросов, разбор, память ошибок, дрилл; Premium помечен «Coming later», цены нет. Ниже — «Practice only» и лицензия AGPL-3.0-or-later.",
    }),
    state("settings-voice", "Settings · попап, строки", () => (
      <EngineFixture engines={makeEngines()}>
        <Scene at="/settings/voice" current="settings" currentSessionId={undefined}
          page={<Routes><Route path="/settings/:section" element={<SettingsScreen />} /></Routes>} />
      </EngineFixture>
    ), {
      dark: true, mobile: true,
      note: "D76: настройки открываются попапом поверх страницы, как у Claude: слева поиск и разделы, справа раздел. Каждая настройка — одна строка: название и пояснение слева, контрол справа (переключатель, список, сегменты, кнопка); строки разделены тонкой линией. На телефоне попап на весь экран, широкий контрол уходит под текст, переключатель остаётся справа. Переключатели синие (D76), остальной выбор — нейтральный. Ссылки /settings/<раздел> работают как раньше: открывают попап поверх Home или текущей страницы, Esc, × и клик мимо попапа возвращают назад. D78: строки собраны в группы с заголовком, каждая — в скруглённой рамке; выпадающие списки свои (одинаковые на macOS и Windows), шириной по содержимому; описание «Recognise my speech» не меняется при переключении.",
    }),
    state("settings-general", "Settings · General: CV и тема", () => (
      <EngineFixture engines={makeEngines()}>
        <Scene at="/settings/general" current="settings" currentSessionId={undefined}
          page={<Routes><Route path="/settings/:section" element={<SettingsScreen />} /></Routes>} />
      </EngineFixture>
    ), {
      dark: true, mobile: true,
      note: "D78: раздел General как у Claude. «Your CV» — сам файл (имя, дата), «Replace» и корзина; файл можно перетащить на строку или в пустую зону. Текст, который читает Mike, — под раскрывашкой, его можно вставить вместо файла. Ниже — Appearance с темой. Группы — каждая в своей скруглённой рамке, «Saved» — коротким тостом. Пример CV выдуманный.",
    }),
    state("settings-search", "Settings · поиск", () => (
      <EngineFixture engines={makeEngines()}>
        <Scene at="/settings/engine" current="settings" currentSessionId={undefined}
          page={<Routes><Route path="/settings/:section" element={<SettingsScreen initialQuery="voice" />} /></Routes>} />
      </EngineFixture>
    ), {
      note: "D76: поиск по настройкам ищет по названиям, пояснениям и ключевым словам (например, «dark», «mic», «resume»). Результат — строка «название · раздел · пояснение»; клик или Enter открывает раздел и подсвечивает строку мягкой заливкой, она гаснет за ~2,5 с. Собственная кнопка очистки вместо синего крестика браузера.",
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
