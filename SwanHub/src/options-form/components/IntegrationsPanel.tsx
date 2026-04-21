import type { DynamicFormInfo, FormConfig } from "../config";
import { type Dispatch, type State, currentProfile } from "../state";
import { InfoTooltip } from "./InfoTooltip";
import { Select, type SelectItem } from "./Select";
import { CollapsiblePanel } from "./CollapsiblePanel";

interface Props {
  state: State;
  config: FormConfig;
  dynamic: DynamicFormInfo;
  dispatch: Dispatch;
}

export function IntegrationsPanel({ state, config, dispatch }: Props) {
  return (
    <CollapsiblePanel title="Integrations" icon="fa-cubes">
      <div className="row g-3">
        <SectionHeader title="External computing" />
        <SparkClusterField state={state} config={config} dispatch={dispatch} />
        <CondorField state={state} config={config} dispatch={dispatch} />
        <SectionHeader title="Data access" />
        <RucioFields state={state} config={config} dispatch={dispatch} />
      </div>
    </CollapsiblePanel>
  );
}

function SectionHeader({ title, withDivider }: { title: string; withDivider?: boolean }) {
  return (
    <div className={`col-12 ${withDivider ? "border-top pt-3 mt-1" : ""}`}>
      <h6 className="text-body-secondary text-uppercase small fw-semibold mb-0" style={{ letterSpacing: ".5px" }}>
        {title}
      </h6>
    </div>
  );
}

function SparkClusterField({ state, config, dispatch }: { state: State; config: FormConfig; dispatch: Dispatch }) {
  const profile = currentProfile(config, state);
  return (
    <div className="col-sm-6">
      <label htmlFor="sparkClusterSelect" className="form-label small fw-semibold text-body-secondary">
        Spark cluster
        <InfoTooltip title="Spark cluster to connect to from notebooks." />
      </label>
      <Select
        id="sparkClusterSelect"
        className="form-select form-select-sm"
        items={profile.clusters}
        value={state.cluster}
        onChange={v => dispatch({ type: "setCluster", cluster: v })}
      />
    </div>
  );
}

function CondorField({ state, config, dispatch }: { state: State; config: FormConfig; dispatch: Dispatch }) {
  const profile = currentProfile(config, state);
  return (
    <div className="col-sm-6">
      <label htmlFor="condorSelect" className="form-label small fw-semibold text-body-secondary">
        HTCondor pool
      </label>
      <Select
        id="condorSelect"
        className="form-select form-select-sm"
        items={profile.condor}
        value={state.condor}
        onChange={v => dispatch({ type: "setCondor", condor: v })}
      />
    </div>
  );
}

function RucioFields({ state, config, dispatch }: { state: State; config: FormConfig; dispatch: Dispatch }) {
  const instances = config.rucio?.instances || [];
  const instanceItems: SelectItem[] = instances.length
    ? instances.map(i => ({ value: i.value, label: i.label }))
    : [{ value: "none", label: "None" }];

  const inst = instances.find(i => i.value === state.rucio);
  const rseOpts = inst?.rse_options || [];
  const rseItems: SelectItem[] = rseOpts.length
    ? rseOpts.map(r => ({ value: r.value, label: r.value }))
    : [{ value: "none", label: "None" }];

  return (
    <>
      <div className="col-sm-6">
        <label htmlFor="rucioSelect" className="form-label small fw-semibold text-body-secondary">
          Rucio instance
          <InfoTooltip title="Rucio instance to connect to." />
        </label>
        <Select
          id="rucioSelect"
          className="form-select form-select-sm"
          items={instanceItems}
          value={state.rucio}
          onChange={v => dispatch({ type: "setRucio", rucio: v })}
        />
      </div>
      <div className="col-sm-6">
        <label htmlFor="rseSelect" className="form-label small fw-semibold text-body-secondary">
          Rucio RSE
        </label>
        <Select
          id="rseSelect"
          className="form-select form-select-sm"
          items={rseItems}
          value={state.rucioRse}
          onChange={v => dispatch({ type: "setRucioRse", rse: v })}
          disabled={rseOpts.length === 0}
        />
      </div>
    </>
  );
}
