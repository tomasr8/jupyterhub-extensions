import { useState } from "react";
import { buildUrlParams } from "../url-params";
import { type State } from "../state";

export function CopyUrlButton({ state }: { state: State }) {
  const [label, setLabel] = useState("Copy URL");

  function copyUrlToClipboard() {
    const url = new URL(window.location.href);
    url.search = buildUrlParams(state).toString();
    navigator.clipboard
      .writeText(url.toString())
      .then(() => setLabel("Copied!"))
      .finally(() => setTimeout(() => setLabel("Copy URL"), 2500));
  }

  return (
    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={copyUrlToClipboard}>
      <i className="fa fa-link me-1" />
      {label}
    </button>
  );
}
