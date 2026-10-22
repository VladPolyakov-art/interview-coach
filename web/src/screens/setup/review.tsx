/* Setup on the review page (D81): three steps — AI engine → Check → About you — as static scenes. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { SetupScene, type SetupSceneId } from "./frames";

const state = (id: string, label: string, scene: SetupSceneId, extra: Partial<ReviewState> = {}): ReviewState => ({
  id, label, render: () => <SetupScene id={scene} />, ...extra,
});

export const setupReview: ReviewScreen = {
  id: "setup",
  title: "Setup",
  note: "D81/D82: онбординг — три шага: AI engine (выбор из четырёх) → Check → About you. Проверка — один настоящий обмен (сказал фразу → видно, что распознано → Майк ответил выбранным голосом), а не пять карточек. Голос Майка выбирается на шаге проверки. Всё на шаге 3 необязательно; «Start the first round» сразу запускает раунд. Заново — Settings → About → «Run setup again».",
  states: [
    state("engine-first", "1 · Выбор движка (первый запуск)", "engineFirst", {
      dark: true,
      note: "D82: четыре движка списком, ничего не выбрано за человека (владелец: «нужно давать выбор людям»). Отметка выбора — справа. Ollama — «Recommended», у готовых — «Ready · qwen3:8b». Continue выключена, пока не выбран движок.",
    }),
    state("engine-picked", "1 · Выбрана готовая Ollama", "enginePicked", { mobile: false, note: "Выбор подсвечен, отметка справа; Continue переключает на выбранный движок и ведёт на проверку." }),
    state("engine-no-ollama", "1 · Ollama не установлена", "engineNoOllama", {
      note: "D83: Ollama не нашлась — две кнопки: «Connect» (уже установлена: сервер ищет её и вне PATH — Homebrew, Ollama.app — и запускает) и «Download Ollama». Если Connect ничего не нашёл — подсказка «открой её один раз и нажми Connect ещё раз».",
    }),
    state("engine-not-running", "1 · Ollama не запущена", "engineNotRunning", { mobile: false, note: "D83: установлена, но не запущена — «Connect» сам открывает Ollama и ждёт до 15 с (проверено вживую: ~2 с → Ready). Не получилось — открыть самому или команда ollama serve с копированием." }),
    state("engine-disconnected", "1 · Движок отключён", "engineDisconnected", {
      note: "D84: у готового выбранного движка под строкой «Connected.» + «Disconnect». Отключённый — статус «Disconnected», Continue выключена, «Connect» возвращает (Ollama/Claude Code отключаются только в приложении, сама Ollama не останавливается; у Gemini/OpenAI Disconnect удаляет ключ). Отметка радио — толще (stroke 3).",
    }),
    state("engine-no-claude", "1 · Claude Code не найден", "engineNoClaude", {
      note: "D83: «Connect» ищет уже установленный claude (PATH, ~/.claude/local, Homebrew, ~/.local/bin) — без переустановки. «Install Claude Code» — запасной путь.",
    }),
    state("engine-no-model", "1 · У Ollama нет модели", "engineNoModel", {
      note: "D85: Ollama запущена, модели нет — скачивание прямо из приложения, без Терминала. Кнопка «Download qwen3:8b» (рекомендованная для 16 ГБ RAM, ~5,2 ГБ) и «Smaller one · 2.5 GB» (qwen3:4b-instruct — для медленного интернета или мало места). Команда для Терминала — под «Use Terminal instead».",
    }),
    state("engine-downloading", "1 · Модель скачивается", "engineDownloading", {
      note: "D85: прогресс-бар (новый компонент ДС Progress) и «2.2 GB of 5.2 GB · 41%»; «Cancel» останавливает, повторное «Download» продолжает с места остановки. Скачивание идёт на сервере — не прерывается, если уйти со страницы. Когда готово — движок сам становится Ready, Continue включается.",
    }),
    state("engine-claude-connect", "1 · Claude Code найден, не проверен", "engineClaudeConnect", {
      mobile: false,
      note: "D85: найденный claude больше не «Ready» сразу. «Connect» отправляет один короткий настоящий запрос с плана пользователя (до минуты, «Sending a test request…») — Ready только если Claude ответил. Ответ запоминается; если позже сессия упрётся в «не вошёл» — статус сбрасывается.",
    }),
    state("engine-claude-signed-out", "1 · Claude Code не вошёл", "engineClaudeSignedOut", {
      note: "D85: проверка вернула «Not logged in» — команда claude с копированием: открыть Терминал, войти, нажать Connect. Другая ошибка (лимит, сеть) — текст Claude как есть, красным.",
    }),
    state("engine-no-codex", "1 · Codex не найден", "engineNoCodex", {
      mobile: false,
      note: "D86: пятый движок — Codex CLI на подписке ChatGPT. Не найден — команда установки brew install --cask codex с копированием и «Connect» (ищет уже установленный codex: PATH, Homebrew, npm, ~/.local/bin). Логотип — знак OpenAI.",
    }),
    state("engine-codex-signed-out", "1 · Codex не вошёл", "engineCodexSignedOut", {
      mobile: false,
      note: "D86: вход проверяется локально и бесплатно (codex login status) — без запроса. Не вошёл — команда codex login с копированием: войти через ChatGPT, нажать Connect. В списке слово «Not signed in», а не «Key rejected» (то же у Claude Code).",
    }),
    state("engine-codex-connect", "1 · Codex вошёл, не проверен", "engineCodexConnect", {
      note: "D86: как у Claude Code — «Connect» шлёт один короткий настоящий запрос с плана ChatGPT, Ready только если Codex ответил. Codex запускается без инструментов: без команд и файлов, без веба, приложений, плагинов, MCP и твоих настроек, в пустой временной папке, сессия не сохраняется.",
    }),
    state("engine-codex-ready", "1 · Codex подключён", "engineCodexReady", { mobile: false, note: "D86: Codex ответил на Connect — статус Ready, под строкой «Connected.» + «Disconnect», Continue включается. В настройках — «Codex answered. It's connected.» и условие: запросы идут с плана ChatGPT, правила OpenAI." }),
    state("engine-no-antigravity", "1 · Antigravity не найден", "engineNoAntigravity", {
      mobile: false,
      note: "D87: шестой движок — Antigravity CLI (agy) на аккаунте Google. Не найден — команда установки с копированием и «Connect» (ищет уже установленный agy: PATH, Homebrew, ~/.local/bin). Логотип — знак Antigravity.",
    }),
    state("engine-antigravity-signed-out", "1 · Antigravity не вошёл", "engineAntigravitySignedOut", {
      note: "D87: вход проверяется без запроса к модели (agy models — список моделей, ~1,5 с). Не вошёл — команда agy с копированием: новое окно Терминала, вход через Google в браузере, потом Connect.",
    }),
    state("engine-antigravity-connect", "1 · Antigravity вошёл, не проверен", "engineAntigravityConnect", {
      mobile: false,
      note: "D87: как у Codex — «Connect» шлёт один короткий настоящий запрос, Ready только если Antigravity ответил. Выключателя инструментов у agy нет, поэтому: пустая временная папка, песочница, без слэш-команд; в фоновом режиме он сам отказывает командам, файлам вне папки, браузеру и MCP, а веб-поиск или субагента Vukoli останавливает на первом шаге. Antigravity хранит каждый разговор — Vukoli удаляет свои по id.",
    }),
    state("engine-antigravity-ready", "1 · Antigravity подключён", "engineAntigravityReady", { mobile: false, note: "D87: Antigravity ответил на Connect — Ready, «Connected.» + «Disconnect», Continue включается. Условие: запросы идут с аккаунта Google и считаются в квоту Antigravity, правила Google." }),
    state("check-idle", "2 · Проверка — старт", "checkIdle", {
      dark: true,
      note: "Сверху выбор голоса Майка и ▶ образец. Справа от голоса — кнопка «Listen» (D82: с подписью, не значок). Ниже — микрофон: «Press the mic and say “Hi Mike, can you hear me?”» (13b: без подзаголовка и подписи «Voice check»). Справа внизу — «I'll type instead», без проверки микрофона.",
    }),
    state("check-listening", "2 · Слушаем", "checkListening", { note: "D82: сверху — то же свечение, что в сессии: идёт за вашим голосом. Уровень и на кнопке; отправка сама после паузы или по «Done»." }),
    state("check-thinking", "2 · Распознано, Майк отвечает", "checkThinking", { mobile: false, note: "Ваша фраза пузырём, у Майка — «Mike is answering…»; свечение сверху «думает» — одна волна ходит из стороны в сторону." }),
    state("check-done", "2 · Работает", "checkDone", {
      note: "Фраза и ответ Майка (звучит выбранным голосом, свечение говорит вместе с ним; «Play again»). Чекбокс телеметрии — снят по умолчанию. «It works» → шаг 3; «Try again» — ещё раз.",
    }),
    state("check-mic-denied", "2 · Микрофон запрещён", "checkMicDenied", { mobile: false, note: "Причина и как разрешить в браузере; «Try again» и «I'll type instead»." }),
    state("check-not-heard", "2 · Ничего не услышали", "checkNotHeard", { mobile: false, note: "Тишина или слишком тихо: подсказка про микрофон, «Try again»." }),
    state("check-engine", "2 · Движок не ответил", "checkEngine", { mobile: false, note: "Распознали, но движок не ответил: текст ошибки и «Back to AI engine»." }),
    state("check-save-error", "2 · Голос не сохранился", "checkSaveError", { mobile: false, note: "Q8: смена голоса не сохранилась — красная плашка «Couldn't save: …» над строками, как в Settings. Раньше ошибка глоталась молча." }),
    state("about", "3 · О вас — пусто", "about", {
      note: "Три блока, всё необязательно: имя (так Майк к вам обращается), резюме — тот же редактор, что в Settings → General, вакансия и «голос / клавиатура». «Not now» — на Home, «Start the first round» — сразу в раунд. Файлы в кадре — фикстура (Alex Morgan).",
    }),
    state("about-save-error", "3 · Имя не сохранилось", "aboutSaveError", { mobile: false, note: "Q8: имя не сохранилось — плашка над строками, введённое имя остаётся в поле. «Start» остаётся на шаге один раз, повторное нажатие идёт дальше без имени." }),
    state("about-filled", "3 · О вас — заполнено", "aboutFilled", { note: "Имя Alex, два файла, вакансия «Product Designer · Lumen». Кнопка — «Start the first round» с иконкой выбранного способа ответа." }),
  ],
};
