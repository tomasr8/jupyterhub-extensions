import type { DynamicFormInfo, FormConfig } from "../config";
import { type Dispatch, type State, releaseGroupsForCard } from "../state";
import { InfoTooltip } from "./InfoTooltip";
import { Select, type SelectItem } from "./Select";
import { CollapsiblePanel } from "./CollapsiblePanel";

interface Props {
  state: State;
  config: FormConfig;
  dynamic: DynamicFormInfo;
  dispatch: Dispatch;
}

export function AdvancedPanel({ state, config, dispatch }: Props) {
  return (
    <CollapsiblePanel title="Advanced settings" icon="fa-sliders">
      <div className="row g-3">
        <div className="col-sm-6">
          <LcgReleaseField state={state} config={config} dispatch={dispatch} />
        </div>
        <div className="col-sm-6">
          <EnvScriptField state={state} dispatch={dispatch} />
        </div>
      </div>
    </CollapsiblePanel>
  );
}

function LcgReleaseField({ state, config, dispatch }: { state: State; config: FormConfig; dispatch: Dispatch }) {
  const groups = releaseGroupsForCard(config, state.card);
  const items: SelectItem[] = groups.map(g => ({
    group: g.label,
    items: g.releases,
  }));

  return (
    <>
      <label htmlFor="releaseSelect" className="form-label small fw-semibold text-body-secondary">
        Release
        <InfoTooltip title="LCG software bundle. See lcginfo.cern.ch." />
      </label>
      <Select
        id="releaseSelect"
        className="form-select form-select-sm"
        items={items}
        value={state.release}
        onChange={v => dispatch({ type: "setRelease", release: v })}
      />
    </>
  );
}

function EnvScriptField({ state, dispatch }: { state: State; dispatch: Dispatch }) {
  return (
    <>
      <label htmlFor="envScriptInput" className="form-label small fw-semibold text-body-secondary">
        Environment script
        <InfoTooltip title="Bash script with custom env vars. $CERNBOX_HOME resolves to /eos/user/u/username." />
      </label>
      <input
        id="envScriptInput"
        type="text"
        className="form-control form-control-sm"
        placeholder="$CERNBOX_HOME/MySWAN/myscript.sh"
        value={state.envScript}
        onChange={e => dispatch({ type: "setEnvScript", value: e.target.value })}
      />
    </>
  );
}
