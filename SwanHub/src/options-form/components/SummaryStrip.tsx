import type { DynamicFormInfo, FormConfig } from "../config";
import {
  type Dispatch,
  type State,
  currentProfile,
  profileAllowsGpu,
} from "../state";
import { Select, type SelectItem } from "./Select";

interface Props {
  state: State;
  config: FormConfig;
  dynamic: DynamicFormInfo;
  dispatch: Dispatch;
}

export function SummaryStrip({ state, config, dynamic, dispatch }: Props) {
  const profile = currentProfile(config, state);
  const cores = (profile?.cores || []).map((c) => ({
    value: c,
    label: String(c),
  }));
  const memory = (profile?.memory || []).map((m) => ({
    value: m,
    label: `${m} GB`,
  }));

  const gpuAllowed = profileAllowsGpu(config, state);
  const gpuItems = buildGpuItems(dynamic, gpuAllowed);

  return (
    <div>
      <h6
        className="text-body-secondary text-uppercase small fw-semibold mb-2"
        style={{ letterSpacing: ".5px" }}
      >
        Resources
      </h6>
      <div className="mb-4 d-flex flex-wrap align-items-center gap-4">
        <div
          style={{
            display: "flex",
            flex: "1",
            alignItems: "center",
            gap: "1em",
          }}
        >
          <div className="input-group">
            <span className="input-group-text">CPU</span>
            <Select
              className="form-select"
              items={cores}
              value={state.cores}
              onChange={(v) => dispatch({ type: "setCores", cores: Number(v) })}
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flex: "1",
            alignItems: "center",
            gap: "1em",
          }}
        >
          <div className="input-group">
            <span className="input-group-text">RAM</span>
            <Select
              className="form-select"
              items={memory}
              value={state.memory}
              onChange={(v) =>
                dispatch({ type: "setMemory", memory: Number(v) })
              }
            />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flex: "1",
            alignItems: "center",
            gap: "1em",
          }}
        >
          <div className="input-group">
            <span className="input-group-text">GPU</span>
            <Select
              className="form-select"
              style={{ cursor: gpuAllowed ? "pointer" : "not-allowed" }}
              disabled={!gpuAllowed}
              items={gpuItems}
              value={gpuItemValue(state.gpu, gpuItems)}
              onChange={(v) => dispatch({ type: "setGpu", gpu: v })}
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
  const none = { value: "none", label: "None" };
  if (!allow) return [none];
  if (free.length === 0) {
    return [
      none,
      ...all.map((f) => ({
        value: f,
        label: `${f} (Unavailable)`,
        disabled: true,
      })),
    ];
  }
  const freeSet = new Set(free);
  return [
    ...free.map((f) => ({ value: f, label: f })),
    ...all
      .filter((f) => !freeSet.has(f))
      .map((f) => ({ value: f, label: `${f} (Unavailable)`, disabled: true })),
  ];
}

function gpuItemValue(current: string, items: SelectItem[]): string {
  for (const it of items) {
    if ("group" in it) continue;
    if (it.value === current && !it.disabled) return current;
  }
  for (const it of items) {
    if ("group" in it) continue;
    if (!it.disabled) return String(it.value);
  }
  return "none";
}
