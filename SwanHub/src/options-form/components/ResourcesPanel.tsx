import type { DynamicFormInfo, FormConfig } from "../config";
import { type Dispatch, type State, currentProfile, profileAllowsGpu } from "../state";
import { Select, type SelectItem } from "./Select";

interface Props {
  state: State;
  config: FormConfig;
  dynamic: DynamicFormInfo;
  dispatch: Dispatch;
}

export function ResourcesPanel({ state, config, dynamic, dispatch }: Props) {
  const profile = currentProfile(config, state);
  const cores = profile.cores.map(c => ({
    value: c,
    label: String(c),
  }));
  const memory = profile.memory.map(m => ({
    value: m,
    label: `${m} GB`,
  }));

  const gpuAllowed = profileAllowsGpu(config, state);
  const gpuItems = buildGpuItems(dynamic, gpuAllowed);

  return (
    <div>
      <h6 className="text-body-secondary text-uppercase small fw-semibold mb-2" style={{ letterSpacing: ".5px" }}>
        Resources
      </h6>
      <div className="mb-4 row gx-4">
        <div className="col-3">
          <div className="input-group">
            <span className="input-group-text">CPU</span>
            <Select
              className="form-select"
              items={cores}
              value={state.cores}
              onChange={v => dispatch({ type: "setCores", cores: Number(v) })}
            />
          </div>
        </div>
        <div className="col-4">
          <div className="input-group">
            <span className="input-group-text">RAM</span>
            <Select
              className="form-select"
              items={memory}
              value={state.memory}
              onChange={v => dispatch({ type: "setMemory", memory: Number(v) })}
            />
          </div>
        </div>
        <div className="col-5">
          <div className="input-group">
            <span className="input-group-text">GPU</span>
            <Select
              className="form-select"
              style={{ cursor: gpuAllowed ? "pointer" : "not-allowed" }}
              disabled={!gpuAllowed}
              items={gpuItems}
              value={state.gpu}
              onChange={v => dispatch({ type: "setGpu", gpu: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function buildGpuItems(dynamic: DynamicFormInfo, allow: boolean): SelectItem[] {
  const all = dynamic.gpu_flavours || [];
  const free = dynamic.free_gpu_flavours || [];
  const freeSet = new Set(free);
  const none = { value: "none", label: "None" };
  if (!allow) {
    return [none];
  }
  const freeItems = free.map(f => ({ value: f, label: f }));
  const unavailableItems = all
    .filter(f => !freeSet.has(f))
    .map(f => ({ value: f, label: `${f} (Unavailable)`, disabled: true }));
  if (free.length === 0) {
    return [none, ...unavailableItems];
  }
  return [...freeItems, ...unavailableItems];
}
