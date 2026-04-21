// State model + reducer.
// The reducer closes over `config` via makeReducer(config) so actions
// stay small ({ type, ...args }) without passing config each time.

import type { FormConfig, LcgRelease, ResourceProfile } from "./config";

export type Source = "lcg" | "customenv";
export type CardId = "general" | "cuda" | "nxcals" | "customenv";
export type UiInterface = "classic" | "lab";

export interface State {
  source: Source;
  card: CardId;
  uiInterface: UiInterface;
  release: string;
  builder: string;
  repository: string;
  envScript: string;
  cores: number;
  memory: number;
  gpu: string;
  cluster: string;
  condor: string;
  rucio: string;
  rucioRse: string;
  useLocalPackages: boolean;
  file: string; // URL-autofill passthrough: post-spawn open this file in Lab
}

// Profiles claimed by non-general cards; "general" is a catchall for anything
// else (dev, lhcb, new-misc land there automatically).
const RESERVED_PROFILES = new Set(["cuda", "nxcals", "customenv"]);

export function initialState(config: FormConfig): State {
  return {
    source: "lcg",
    card: "general",
    uiInterface: "classic",
    release: config.lcg_releases.recommended.releases[0].value,
    builder: "",
    repository: "",
    envScript: "",
    cores: config.resource_profiles.general.cores[0],
    memory: config.resource_profiles.general.memory[0],
    gpu: "none",
    cluster: "none",
    condor: "none",
    rucio: "none",
    rucioRse: "none",
    useLocalPackages: false,
    file: "",
  };
}

export function releaseMeta(config: FormConfig, value: string): LcgRelease {
  return Object.values(config.lcg_releases)
    .flatMap(cat => cat.releases)
    .find(rel => rel.value === value)!;
}

export function currentProfile(config: FormConfig, state: State): ResourceProfile {
  if (state.source === "customenv") {
    return config.resource_profiles["customenv"];
  }
  return config.resource_profiles[releaseMeta(config, state.release).profile];
}

interface ReleaseGroup {
  key: string;
  label: string;
  releases: LcgRelease[];
}

export function releaseGroupsForCard(config: FormConfig, cardId: CardId): ReleaseGroup[] {
  const groups: ReleaseGroup[] = [];
  for (const [catKey, cat] of Object.entries(config.lcg_releases)) {
    const releases = cat.releases.filter(r =>
      cardId === "general" ? !RESERVED_PROFILES.has(r.profile) : r.profile === cardId,
    );
    if (releases.length > 0) {
      groups.push({ key: catKey, label: cat.label, releases });
    }
  }
  return groups;
}

export function firstReleaseForCard(config: FormConfig, cardId: CardId): string {
  return releaseGroupsForCard(config, cardId)[0].releases[0].value;
}

// CustomEnv requires JupyterLab. Rucio selection also forces Lab (the
// integration lives there).
export function interfaceLocked(state: State): boolean {
  return state.source === "customenv" || state.rucio !== "none";
}

export function profileAllowsGpu(config: FormConfig, state: State): boolean {
  return state.source === "customenv" || releaseMeta(config, state.release).profile === "cuda";
}

export function withProfileDefaults(state: State, profile: ResourceProfile): State {
  return {
    ...state,
    cores: profile.cores[0],
    memory: profile.memory[0],
    cluster: profile.clusters[0].value,
    condor: profile.condor[0].value,
    gpu: "none",
  };
}

export function applyCard(config: FormConfig, state: State, cardId: CardId): State {
  let next: State = { ...state, card: cardId };
  if (cardId === "customenv") {
    next.source = "customenv";
    next.builder = config.custom_environments.builders[0].value;
  } else {
    next.source = "lcg";
    next.release = firstReleaseForCard(config, cardId);
  }
  next = withProfileDefaults(next, currentProfile(config, next));
  if (interfaceLocked(next)) {
    next.uiInterface = "lab";
  }
  return next;
}

// When release changes, snap resource picks to legal values under
// the new profile.
export function reconcileWithProfile(config: FormConfig, state: State): State {
  const p = currentProfile(config, state);
  return {
    ...state,
    cores: p.cores.includes(state.cores) ? state.cores : p.cores[0],
    memory: p.memory.includes(state.memory) ? state.memory : p.memory[0],
    cluster: p.clusters.some(c => c.value === state.cluster) ? state.cluster : p.clusters[0].value,
    condor: p.condor.some(c => c.value === state.condor) ? state.condor : p.condor[0].value,
    gpu: profileAllowsGpu(config, state) ? state.gpu : "none",
  };
}

export type Action =
  | { type: "pickCard"; card: CardId }
  | { type: "setInterface"; intf: UiInterface }
  | { type: "setRelease"; release: string }
  | { type: "setBuilder"; builder: string }
  | { type: "setCores"; cores: number }
  | { type: "setMemory"; memory: number }
  | { type: "setGpu"; gpu: string }
  | { type: "setCluster"; cluster: string }
  | { type: "setCondor"; condor: string }
  | { type: "setRucio"; rucio: string }
  | { type: "setRucioRse"; rse: string }
  | { type: "setEnvScript"; value: string }
  | { type: "setRepository"; value: string }
  | { type: "setUseLocalPackages"; value: boolean };

export function makeReducer(config: FormConfig) {
  return function reducer(state: State, action: Action): State {
    switch (action.type) {
      case "pickCard":
        return applyCard(config, state, action.card);
      case "setInterface":
        return { ...state, uiInterface: action.intf };
      case "setRelease":
        return reconcileWithProfile(config, {
          ...state,
          release: action.release,
        });
      case "setBuilder":
        return { ...state, builder: action.builder };
      case "setCores":
        return { ...state, cores: action.cores };
      case "setMemory":
        return { ...state, memory: action.memory };
      case "setGpu":
        return { ...state, gpu: action.gpu };
      case "setCluster":
        return { ...state, cluster: action.cluster };
      case "setCondor":
        return { ...state, condor: action.condor };
      case "setRucio": {
        // New instance -> reset RSE; force Lab (integration lives there)
        const next: State = { ...state, rucio: action.rucio, rucioRse: "none" };
        if (action.rucio !== "none" && next.uiInterface !== "lab") {
          next.uiInterface = "lab";
        }
        return next;
      }
      case "setRucioRse":
        return { ...state, rucioRse: action.rse };
      case "setEnvScript":
        return { ...state, envScript: action.value };
      case "setRepository":
        return { ...state, repository: action.value };
      case "setUseLocalPackages":
        return { ...state, useLocalPackages: action.value };
      default:
        return state;
    }
  };
}

export type Dispatch = (action: Action) => void;
