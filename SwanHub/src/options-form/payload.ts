// Builds the JSON object POSTed to the backend when spawing a session.
// Wire format is documented in SwanSpawner/swanspawner/swanspawner.py.

import { type State } from "./state";

export interface BasePayload {
  source: "lcg" | "customenv";
  cores: number;
  memory: number;
  gpu: string;
  cluster: string;
  useJupyterLab: boolean;
  file: string;
}

export interface LcgPayload extends BasePayload {
  source: "lcg";
  release: string;
  envScript: string;
  condor: string;
  rucio: string;
  rucioRse: string;
  useLocalPackages: boolean;
}

export interface CustomenvPayload extends BasePayload {
  source: "customenv";
  builder: string;
  repository: string;
}

export type Payload = LcgPayload | CustomenvPayload;

export function buildPayload(state: State): Payload {
  const base: BasePayload = {
    source: state.source,
    cores: state.cores,
    memory: state.memory,
    gpu: state.gpu,
    cluster: state.cluster,
    useJupyterLab: state.uiInterface === "lab",
    file: state.file,
  };

  if (state.source === "lcg") {
    return {
      ...base,
      source: "lcg",
      release: state.release,
      envScript: state.envScript,
      condor: state.condor,
      rucio: state.rucio,
      rucioRse: state.rucioRse,
      useLocalPackages: state.useLocalPackages,
    };
  }
  return {
    ...base,
    source: "customenv",
    builder: state.builder,
    repository: state.repository,
  };
}
