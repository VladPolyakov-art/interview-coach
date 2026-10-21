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
      note: "Выбрали Ollama, а её нет — под строкой сразу «Download Ollama» (открывает ollama.com/download) и что будет после установки. Статус перепроверяется каждые 5 с; когда станет Ready, Continue включится сама.",
    }),
    state("engine-not-running", "1 · Ollama не запущена", "engineNotRunning", { mobile: false, note: "Установлена, но не запущена: «открой приложение» или команда ollama serve с копированием." }),
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
