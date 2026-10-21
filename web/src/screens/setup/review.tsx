/* Setup on the review page (D81): three steps — AI engine → Check → About you — as static scenes. */
import type { ReviewScreen, ReviewState } from "../../review/screens";
import { SetupScene, type SetupSceneId } from "./frames";

const state = (id: string, label: string, scene: SetupSceneId, extra: Partial<ReviewState> = {}): ReviewState => ({
  id, label, render: () => <SetupScene id={scene} />, ...extra,
});

export const setupReview: ReviewScreen = {
  id: "setup",
  title: "Setup",
  note: "D81: онбординг — три шага: AI engine → Check → About you. Проверка — один настоящий обмен (сказал фразу → видно, что распознано → Майк ответил выбранным голосом), а не пять карточек. Голос Майка выбирается на шаге проверки. Всё на шаге 3 необязательно; «Start the first round» сразу запускает раунд. Заново — Settings → About → «Run setup again».",
  states: [
    state("engine-ready", "1 · Движок готов — одна строка", "engineReady", {
      dark: true,
      note: "Ollama Ready: одна строка «Ollama · qwen3:8b · Ready» и «Change». Решать нечего — Continue активна. Подпись: движок можно сменить позже в Settings.",
    }),
    state("engine-changing", "1 · После «Change»", "engineChanging", { mobile: false, note: "Тот же экран, что Settings → AI engine (D78): в работе сверху, остальные ниже, подключение на месте." }),
    state("engine-not-ready", "1 · Ни один движок не готов", "engineNotReady", {
      note: "Ollama не запущена: причина и как починить — на месте, «Check again». Continue выключена, рядом «Continue once Ollama is Ready.». Обхода в текстовый режим нет — вопросы пишет движок.",
    }),
    state("check-idle", "2 · Проверка — старт", "checkIdle", {
      dark: true,
      note: "Сверху выбор голоса Майка и ▶ образец. Ниже — микрофон: «Press the microphone and say something like “Hi Mike, can you hear me?”». Справа внизу — «I'll type instead», без проверки микрофона.",
    }),
    state("check-listening", "2 · Слушаем", "checkListening", { mobile: false, note: "Уровень с микрофона на кнопке; отправка сама после паузы или по «Done»." }),
    state("check-thinking", "2 · Распознано, Майк отвечает", "checkThinking", { mobile: false, note: "Ваша фраза пузырём, у Майка — «Mike is answering…»." }),
    state("check-done", "2 · Работает", "checkDone", {
      note: "Фраза и ответ Майка (звучит выбранным голосом, «Play again»). Чекбокс телеметрии — снят по умолчанию. «It works» → шаг 3; «Try again» — ещё раз.",
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
