import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SpawnForm } from "./SpawnForm";
import type { DynamicFormInfo, FormConfig } from "./config";
import "./styles.css";

function readJsonScript<T>(id: string): T {
  const el = document.getElementById(id)!;
  return JSON.parse(el.textContent) as T;
}

function init(): void {
  const mount = document.getElementById("swan-options-form")!;

  const config = readJsonScript<FormConfig>("swan-options-form-config");
  const dynamic = readJsonScript<DynamicFormInfo>("swan-options-form-dynamic");

  const root = createRoot(mount);
  root.render(
    <StrictMode>
      <SpawnForm config={config} dynamic={dynamic} />
    </StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
