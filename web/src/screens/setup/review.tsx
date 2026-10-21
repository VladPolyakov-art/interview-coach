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
    state("check-idle", "2 · Проверка — старт", "checkIdle", {
      dark: true,
      note: "Сверху выбор голоса Майка и ▶ образец. Справа от голоса — кнопка «Listen» (D82: с подписью, не значок). Ниже — микрофон: «Press the microphone and say something like “Hi Mike, can you hear me?”». Справа внизу — «I'll type instead», без проверки микрофона.",
    }),
    state("check-listening", "2 · Слушаем", "checkListening", { note: "D82: сверху — то же свечение, что в сессии: идёт за вашим голосом. Уровень и на кнопке; отправка сама после паузы или по «Done»." }),
    state("check-thinking", "2 · Распознано, Майк отвечает", "checkThinking", { mobile: false, note: "Ваша фраза пузырём, у Майка — «Mike is answering…»; свечение сверху «думает» — одна волна ходит из стороны в сторону." }),
    state("check-done", "2 · Работает", "checkDone", {
      note: "Фраза и ответ Майка (звучит выбранным голосом, свечение говорит вместе с ним; «Play again»). Чекбокс телеметрии — снят по умолчанию. «It works» → шаг 3; «Try again» — ещё раз.",
    }),
    state("check-mic-denied", "2 · Микрофон запрещён", "checkMicDenied", { mobile: false, note: "Причина и как разрешить в браузере; «Try again» и «I'll type instead»." }),
    state("check-not-heard", "2 · Ничего не услышали", "checkNotHeard", { mobile: false, note: "Тишина или слишком тихо: подсказка про микрофон, «Try again»." }),
    state("check-engine", "2 · Движок не ответил", "checkEngine", { mobile: false, note: "Распознали, но движок не ответил: текст ошибки и «Back to AI engine»." }),
    state("about", "3 · О вас — пусто", "about", {
      note: "Три блока, всё необязательно: имя (так Майк к вам обращается), резюме — тот же редактор, что в Settings → General, вакансия и «голос / клавиатура». «Not now» — на Home, «Start the first round» — сразу в раунд. Файлы в кадре — фикстура (Alex Morgan).",
    }),
    state("about-filled", "3 · О вас — заполнено", "aboutFilled", { note: "Имя Alex, два файла, вакансия «Product Designer · Lumen». Кнопка — «Start the first round» с иконкой выбранного способа ответа." }),
  ],
};
