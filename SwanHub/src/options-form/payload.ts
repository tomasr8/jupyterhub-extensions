// Builds the JSON object POSTed to the backend. Only includes fields the
// active source cares about; the server derives the rest (platform, rucio
// mount path, etc.) and rejects unknown keys.
//
// Wire format is documented in SwanSpawner/swanspawner/swanspawner.py.

import { INTF_LAB, SOURCE_LCG, type State } from './state';

export interface BasePayload {
  source: 'lcg' | 'customenv';
  cores: number | null;
  memory: number | null;
  gpu: string;
  cluster: string;
  useJupyterLab: boolean;
  file?: string;
}

export interface LcgPayload extends BasePayload {
  source: 'lcg';
  release: string;
  scriptEnv: string;
  condor: string;
  rucio: string;
  rucioRse: string;
  useLocalPackages: boolean;
}

export interface CustomenvPayload extends BasePayload {
  source: 'customenv';
  builder: string;
  repository: string;
}

export type Payload = LcgPayload | CustomenvPayload;

export function buildPayload(state: State): Payload {
  const base: BasePayload = {
    source:        state.source,
    cores:         state.cores,
    memory:        state.memory,
    gpu:           state.gpu,
    cluster:       state.cluster,
    useJupyterLab: state.uiInterface === INTF_LAB,
  };
  if (state.file) base.file = state.file;

  if (state.source === SOURCE_LCG) {
    return {
      ...base,
      source:           'lcg',
      release:          state.release,
      scriptEnv:        state.scriptEnv,
      condor:           state.condor,
      rucio:            state.rucio,
      rucioRse:         state.rucioRse,
      useLocalPackages: state.useLocalPackages,
    };
  }
  return {
    ...base,
    source:     'customenv',
    builder:    state.builder,
    repository: state.repository,
  };
}
