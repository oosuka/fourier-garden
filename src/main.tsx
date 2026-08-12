import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/noto-serif-jp/400.css";
import "katex/dist/katex.min.css";
import "./styles.css";
import "./styles/responsive.css";

import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { App } from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Application root is missing");
const applicationRoot =
  (import.meta.hot?.data.applicationRoot as Root | undefined) ?? createRoot(rootElement);
if (import.meta.hot) import.meta.hot.data.applicationRoot = applicationRoot;
applicationRoot.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
