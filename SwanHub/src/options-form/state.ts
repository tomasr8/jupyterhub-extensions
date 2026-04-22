// State model + reducer. Every action produces a new state (no mutation).
// The reducer closes over `config` via makeReducer(config) so actions
// stay small ({ type, ...args }) without passing config each time.

import type {
  Builder,
  FormConfig,
  LcgRelease,
  ResourceProfile,
  ValueLabel,
} from "./config";

export type Source = "lcg" | "customenv";
export type CardId = "general" | "gpu" | "nxcals" | "custom";
export type UiInterface = "classic" | "lab";

export interface State {
  source: Source;
  card: CardId;
  uiInterface: UiInterface;
  release: string;
  builder: string;
  repository: string;
  scriptEnv: string;
  cores: number | null;
  memory: number | null;
  gpu: string;
  cluster: string;
  condor: string;
  rucio: string;
  rucioRse: string;
  useLocalPackages: boolean;
  useTN: boolean;
  file: string; // URL-autofill passthrough: post-spawn open this file in Lab
  advancedOpen: boolean;
}

export const SOURCE_LCG: Source = "lcg";
export const SOURCE_CUSTOM: Source = "customenv";
export const INTF_CLASSIC: UiInterface = "classic";
export const INTF_LAB: UiInterface = "lab";

// Profiles claimed by non-general cards; "general" is a catchall for anything
// else (dev, lhcb, new-misc land there automatically).
const RESERVED_PROFILES = new Set(["cuda", "nxcals", "customenv"]);

export function initialState(): State {
  return {
    source: SOURCE_LCG,
    card: "general",
    uiInterface: INTF_CLASSIC,
    release: "",
    builder: "",
    repository: "",
    scriptEnv: "",
    cores: null,
    memory: null,
    gpu: "none",
    cluster: "none",
    condor: "none",
    rucio: "none",
    rucioRse: "none",
    useLocalPackages: false,
    useTN: false,
    file: "",
    advancedOpen: false,
  };
}

// ─── Config lookups (pure) ─────────────────────────────────────────────────

export function releaseMeta(
  config: FormConfig,
  value: string,
): LcgRelease | null {
  for (const cat of Object.values(config.lcg_releases || {}))
    for (const rel of cat.releases || []) if (rel.value === value) return rel;
  return null;
}

export function builderMeta(config: FormConfig, value: string): Builder | null {
  return (
    (config.custom_environments?.builders || []).find(
      (b) => b.value === value,
    ) || null
  );
}

export function profileByName(
  config: FormConfig,
  name: string,
): ResourceProfile | null {
  return (config.resource_profiles || {})[name] || null;
}

export function currentProfile(
  config: FormConfig,
  state: State,
): ResourceProfile | null {
  if (state.source === SOURCE_CUSTOM) {
    const b = builderMeta(config, state.builder);
    return b ? profileByName(config, b.profile) : null;
  }
  const r = releaseMeta(config, state.release);
  return r ? profileByName(config, r.profile) : null;
}

export function profileMatchesCard(profile: string, card: CardId): boolean {
  if (card === "gpu") return profile === "cuda";
  if (card === "nxcals") return profile === "nxcals";
  if (card === "custom") return profile === "customenv";
  if (card === "general") return !RESERVED_PROFILES.has(profile);
  return false;
}

export interface ReleaseGroup {
  key: string;
  label: string;
  releases: LcgRelease[];
}

export function releaseGroupsForCard(
  config: FormConfig,
  cardId: CardId,
): ReleaseGroup[] {
  const groups: ReleaseGroup[] = [];
  for (const [catKey, cat] of Object.entries(config.lcg_releases || {})) {
    const rels = (cat.releases || []).filter((r) =>
      profileMatchesCard(r.profile, cardId),
    );
    if (rels.length)
      groups.push({ key: catKey, label: cat.label, releases: rels });
  }
  return groups;
}

export function firstReleaseForCard(
  config: FormConfig,
  cardId: CardId,
): string {
  return releaseGroupsForCard(config, cardId)[0]?.releases[0]?.value || "";
}

// CustomEnv requires JupyterLab. Rucio selection also forces Lab (the
// integration lives there).
export function interfaceLocked(state: State): boolean {
  return (
    state.source === SOURCE_CUSTOM ||
    (state.rucio !== "" && state.rucio !== "none")
  );
}

export function profileAllowsGpu(config: FormConfig, state: State): boolean {
  if (state.source === SOURCE_CUSTOM) return true;
  const rel = releaseMeta(config, state.release);
  return !!(rel && rel.value.toLowerCase().includes("cuda"));
}

// Map a release value back to the card it belongs to (for URL autofill).
export function cardForRelease(config: FormConfig, value: string): CardId {
  const meta = releaseMeta(config, value);
  if (!meta) return "general";
  if (meta.profile === "cuda") return "gpu";
  if (meta.profile === "nxcals") return "nxcals";
  return "general";
}

// ─── Transitions (pure; take state, return new state) ──────────────────────

function withProfileDefaults(
  state: State,
  profile: ResourceProfile | null,
): State {
  if (!profile) return state;
  return {
    ...state,
    cores: profile.cores?.[0] ?? state.cores,
    memory: profile.memory?.[0] ?? state.memory,
    cluster: profile.clusters?.[0]?.value ?? "none",
    condor: profile.condor?.[0]?.value ?? "none",
    gpu: "none",
  };
}

export function applyCard(
  config: FormConfig,
  state: State,
  cardId: CardId,
): State {
  let next: State = { ...state, card: cardId };
  if (cardId === "custom") {
    next.source = SOURCE_CUSTOM;
    next.builder = config.custom_environments?.builders?.[0]?.value || "";
  } else {
    next.source = SOURCE_LCG;
    next.release = firstReleaseForCard(config, cardId);
  }
  next = withProfileDefaults(next, currentProfile(config, next));
  if (interfaceLocked(next)) next.uiInterface = INTF_LAB;
  return next;
}

function coerceNumber(
  value: number | null,
  allowed: number[] | undefined,
): number | null {
  if (!allowed?.length) return value;
  return value != null && allowed.includes(value) ? value : allowed[0];
}

function coerceString(
  value: string,
  allowed: ValueLabel[] | undefined,
): string {
  if (!allowed?.length) return value;
  const values = allowed.map((i) => i.value);
  return values.includes(value) ? value : values[0];
}

// When release/builder changes, snap resource picks to legal values under
// the new profile.
export function reconcileWithProfile(config: FormConfig, state: State): State {
  const p = currentProfile(config, state);
  if (!p) return state;
  return {
    ...state,
    cores: coerceNumber(state.cores, p.cores),
    memory: coerceNumber(state.memory, p.memory),
    cluster: coerceString(state.cluster, p.clusters),
    condor:
      state.source === SOURCE_LCG
        ? coerceString(state.condor, p.condor)
        : "none",
    gpu: profileAllowsGpu(config, state) ? state.gpu : "none",
  };
}

// ─── Reducer ───────────────────────────────────────────────────────────────

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
  | { type: "setScriptEnv"; value: string }
  | { type: "setRepository"; value: string }
  | { type: "setUseLocalPackages"; value: boolean }
  | { type: "toggleAdvanced" };

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
        return reconcileWithProfile(config, {
          ...state,
          builder: action.builder,
        });
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
        // New instance → reset RSE; force Lab (integration lives there)
        const next: State = { ...state, rucio: action.rucio, rucioRse: "none" };
        if (action.rucio !== "none" && next.uiInterface !== INTF_LAB)
          next.uiInterface = INTF_LAB;
        return next;
      }
      case "setRucioRse":
        return { ...state, rucioRse: action.rse };
      case "setScriptEnv":
        return { ...state, scriptEnv: action.value };
      case "setRepository":
        return { ...state, repository: action.value };
      case "setUseLocalPackages":
        return { ...state, useLocalPackages: action.value };
      case "toggleAdvanced":
        return { ...state, advancedOpen: !state.advancedOpen };
    }
  };
}

export type Dispatch = (action: Action) => void;
