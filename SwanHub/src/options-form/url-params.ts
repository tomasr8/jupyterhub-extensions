// URL query params use the legacy flat names (cores, memory, lcg, rucioRSE,
// etc.) for bookmark compatibility. The new camelCase JSON schema is only
// used in the POST body.

import type { FormConfig, Domains } from './config';
import {
  cardForRelease,
  currentProfile,
  firstReleaseForCard,
  INTF_CLASSIC,
  INTF_LAB,
  initialState,
  profileAllowsGpu,
  reconcileWithProfile,
  SOURCE_CUSTOM,
  SOURCE_LCG,
  type State,
} from './state';

// Build the initial state from the URL (autofill for bookmarked URLs).
// If no params are present, returns the fresh default for the given card.
export function stateFromUrl(config: FormConfig, withCustomenvFeature: boolean): State {
  const args = new URLSearchParams(window.location.search);
  let state = initialState();

  if (args.size === 0) {
    return applyCardFresh(config, state, 'general');
  }

  const src = args.get('software_source');
  if (src === SOURCE_CUSTOM && withCustomenvFeature) {
    state = {
      ...state,
      source:  SOURCE_CUSTOM,
      card:    'custom',
      builder: args.get('builder') || config.custom_environments?.builders?.[0]?.value || '',
    };
  } else {
    const rel = args.get('lcg');
    state = {
      ...state,
      source:  SOURCE_LCG,
      release: rel || firstReleaseForCard(config, 'general'),
      card:    rel ? cardForRelease(config, rel) : 'general',
    };
  }

  // Apply profile defaults under the selected release/builder
  const profile = currentProfile(config, state);
  if (profile) {
    state = {
      ...state,
      cores:   profile.cores?.[0]  ?? state.cores,
      memory:  profile.memory?.[0] ?? state.memory,
      cluster: profile.clusters?.[0]?.value ?? 'none',
      condor:  profile.condor?.[0]?.value   ?? 'none',
    };
  }

  // Override with explicit URL values
  const g = (k: string) => args.get(k);
  const patch: Partial<State> = {};
  if (g('cores'))      patch.cores      = Number(g('cores'));
  if (g('memory'))     patch.memory     = Number(g('memory'));
  if (g('gpu'))        patch.gpu        = g('gpu')!;
  if (g('clusters'))   patch.cluster    = g('clusters')!;
  if (g('condor'))     patch.condor     = g('condor')!;
  if (g('rucio'))      patch.rucio      = g('rucio')!;
  if (g('rucioRSE'))   patch.rucioRse   = g('rucioRSE')!;
  if (g('scriptenv'))  patch.scriptEnv  = g('scriptenv')!;
  if (g('repository')) patch.repository = g('repository')!;
  if (g('file'))       patch.file       = g('file')!;
  patch.useLocalPackages = (g('use-local-packages') || '').toLowerCase() === 'true';
  patch.useTN            = (g('use-tn')             || '').toLowerCase() === 'true';

  const lab = (g('use-jupyterlab') || '').toLowerCase() === 'true' || state.source === SOURCE_CUSTOM;
  patch.uiInterface = lab ? INTF_LAB : INTF_CLASSIC;

  if (args.has('condor') || args.has('scriptenv') || args.has('rucio') || args.has('clusters')) {
    patch.advancedOpen = true;
  }

  state = reconcileWithProfile(config, { ...state, ...patch });
  if (!profileAllowsGpu(config, state)) state = { ...state, gpu: 'none' };
  return state;
}

// Used when no URL params: apply defaults for the starting card
function applyCardFresh(config: FormConfig, state: State, card: 'general'): State {
  const next: State = { ...state, card, source: SOURCE_LCG, release: firstReleaseForCard(config, card) };
  const profile = currentProfile(config, next);
  if (!profile) return next;
  return {
    ...next,
    cores:   profile.cores?.[0]  ?? next.cores,
    memory:  profile.memory?.[0] ?? next.memory,
    cluster: profile.clusters?.[0]?.value ?? 'none',
    condor:  profile.condor?.[0]?.value   ?? 'none',
  };
}

export function buildUrlParams(state: State): URLSearchParams {
  const p = new URLSearchParams();
  p.append('software_source', state.source);
  if (state.source === SOURCE_LCG) {
    if (state.release)                             p.append('lcg',                 state.release);
    if (state.scriptEnv)                           p.append('scriptenv',           state.scriptEnv);
    if (state.condor !== 'none')                   p.append('condor',              state.condor);
    if (state.rucio !== 'none') {
      p.append('rucio', state.rucio);
      if (state.rucioRse !== 'none')               p.append('rucioRSE',            state.rucioRse);
    }
    if (state.useLocalPackages)                    p.append('use-local-packages',  'true');
  } else {
    if (state.builder)    p.append('builder',    state.builder);
    if (state.repository) p.append('repository', state.repository);
  }
  if (state.cores  != null)                        p.append('cores',  String(state.cores));
  if (state.memory != null)                        p.append('memory', String(state.memory));
  if (state.gpu     && state.gpu     !== 'none')   p.append('gpu',      state.gpu);
  if (state.cluster && state.cluster !== 'none')   p.append('clusters', state.cluster);
  if (state.uiInterface === INTF_LAB)              p.append('use-jupyterlab', 'true');
  if (state.useTN)                                 p.append('use-tn',         'true');
  if (state.file)                                  p.append('file',           state.file);
  return p;
}

export function copyUrlToClipboard(state: State, onStatus: (msg: string) => void): void {
  const u = new URL(window.location.href.split('?')[0]);
  u.search = buildUrlParams(state).toString();
  navigator.clipboard.writeText(u.toString())
    .then(() => onStatus('Copied!'))
    .catch(() => onStatus('Failed'))
    .finally(() => setTimeout(() => onStatus('Copy URL'), 2500));
}

// TN toggle redirects to the other domain with current state as URL params.
export function toggleTN(state: State, domains: Domains, enabled: boolean): void {
  const host = enabled ? domains.ats : domains.general;
  const qs = buildUrlParams({ ...state, useTN: enabled }).toString();
  window.location.href = `https://${host}/hub/spawn${qs ? '?' + qs : ''}`;
}
