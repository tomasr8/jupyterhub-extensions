// URL query params use the legacy flat names (cores, memory, lcg, rucioRSE,
// etc.) for bookmark compatibility. The new camelCase JSON schema is only
// used in the POST body.

import type { FormConfig } from "./config";
import {
  type CardId,
  currentProfile,
  firstReleaseForCard,
  initialState,
  profileAllowsGpu,
  reconcileWithProfile,
  releaseMeta,
  withProfileDefaults,
  type State,
} from "./state";

// Build the initial state from the URL (autofill for bookmarked URLs).
// If no params are present, returns the fresh default for the given card.
export function stateFromUrl(config: FormConfig): State {
  const args = new URLSearchParams(window.location.search);
  let state = initialState(config);

  if (args.size === 0) {
    return state;
  }

  const src = args.get("software_source");
  if (src === "customenv") {
    const builderParam = args.get("builder");
    state = {
      ...state,
      source: "customenv",
      card: "customenv",
      builder:
        builderParam && isKnownBuilder(config, builderParam)
          ? builderParam
          : config.custom_environments.builders[0].value,
    };
  } else {
    const relParam = args.get("lcg");
    const release = relParam && isKnownRelease(config, relParam) ? relParam : firstReleaseForCard(config, "general");
    const profile = releaseMeta(config, release).profile;
    const card: CardId = profile === "cuda" || profile === "nxcals" ? profile : "general";
    state = {
      ...state,
      source: "lcg",
      release,
      card,
    };
  }

  // Apply profile defaults under the selected release/builder
  const profile = currentProfile(config, state);
  state = withProfileDefaults(state, profile);

  // Override with explicit URL values
  const g = (k: string) => args.get(k);
  const patch: Partial<State> = {};
  if (g("cores")) {
    patch.cores = Number(g("cores"));
  }
  if (g("memory")) {
    patch.memory = Number(g("memory"));
  }
  if (g("gpu")) {
    patch.gpu = g("gpu")!;
  }
  if (g("clusters")) {
    patch.cluster = g("clusters")!;
  }
  if (g("condor")) {
    patch.condor = g("condor")!;
  }
  if (g("rucio")) {
    patch.rucio = g("rucio")!;
  }
  if (g("rucioRSE")) {
    patch.rucioRse = g("rucioRSE")!;
  }
  if (g("scriptenv")) {
    patch.envScript = g("scriptenv")!;
  }
  if (g("repository")) {
    patch.repository = g("repository")!;
  }
  if (g("file")) {
    patch.file = g("file")!;
  }
  patch.useLocalPackages = (g("use-local-packages") || "").toLowerCase() === "true";

  const lab = (g("use-jupyterlab") || "").toLowerCase() === "true" || state.source === "customenv";
  patch.uiInterface = lab ? "lab" : "classic";

  state = reconcileWithProfile(config, { ...state, ...patch });
  if (!profileAllowsGpu(config, state)) {
    state = { ...state, gpu: "none" };
  }
  return state;
}

export function buildUrlParams(state: State): URLSearchParams {
  const p = new URLSearchParams();
  p.append("software_source", state.source);
  if (state.source === "lcg") {
    if (state.release) {
      p.append("lcg", state.release);
    }
    if (state.envScript) {
      p.append("scriptenv", state.envScript);
    }
    if (state.condor !== "none") {
      p.append("condor", state.condor);
    }
    if (state.rucio !== "none") {
      p.append("rucio", state.rucio);
      if (state.rucioRse !== "none") {
        p.append("rucioRSE", state.rucioRse);
      }
    }
    if (state.useLocalPackages) {
      p.append("use-local-packages", "true");
    }
  } else {
    if (state.builder) {
      p.append("builder", state.builder);
    }
    if (state.repository) {
      p.append("repository", state.repository);
    }
  }
  if (state.cores != null) {
    p.append("cores", String(state.cores));
  }
  if (state.memory != null) {
    p.append("memory", String(state.memory));
  }
  if (state.gpu && state.gpu !== "none") {
    p.append("gpu", state.gpu);
  }
  if (state.cluster && state.cluster !== "none") {
    p.append("clusters", state.cluster);
  }
  if (state.uiInterface === "lab") {
    p.append("use-jupyterlab", "true");
  }
  if (state.file) {
    p.append("file", state.file);
  }
  return p;
}

function isKnownRelease(config: FormConfig, value: string): boolean {
  return Object.values(config.lcg_releases).some(cat => cat.releases.some(r => r.value === value));
}

function isKnownBuilder(config: FormConfig, value: string): boolean {
  return config.custom_environments.builders.some(b => b.value === value);
}
