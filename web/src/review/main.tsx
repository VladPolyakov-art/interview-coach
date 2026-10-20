import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../ds/global.css";
import { ReviewPage } from "./ReviewPage";

createRoot(document.getElementById("root")!).render(<StrictMode><ReviewPage /></StrictMode>);
