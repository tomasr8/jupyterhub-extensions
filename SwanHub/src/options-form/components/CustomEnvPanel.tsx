import type { FormConfig } from "../config";
import { type Dispatch, type State } from "../state";
import { InfoTooltip } from "./InfoTooltip";
import { Select } from "./Select";

interface Props {
  state: State;
  config: FormConfig;
  dispatch: Dispatch;
}

export function CustomEnvPanel({ state, config, dispatch }: Props) {
  return (
    <div className="mb-4">
      <h6 className="text-body-secondary text-uppercase small fw-semibold mb-2" style={{ letterSpacing: ".5px" }}>
        Custom environment
      </h6>
      <div className="col-12">
        <div className="row g-3">
          <div className="col-sm-8">
            <RepositoryField state={state} dispatch={dispatch} />
          </div>
          <div className="col-sm-4">
            <BuilderField state={state} config={config} dispatch={dispatch} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RepositoryField({ state, dispatch }: { state: State; dispatch: Dispatch }) {
  return (
    <>
      <label htmlFor="repositoryInput" className="form-label small fw-semibold text-body-secondary">
        Repository
        <InfoTooltip title="Git repository containing a requirements file" />
      </label>
      <input
        id="repositoryInput"
        type="text"
        className="form-control"
        placeholder="https://gitlab.cern.ch/user/repo"
        value={state.repository}
        onChange={e => dispatch({ type: "setRepository", value: e.target.value })}
      />
    </>
  );
}

function BuilderField({ state, config, dispatch }: { state: State; config: FormConfig; dispatch: Dispatch }) {
  return (
    <>
      <label htmlFor="builderSelect" className="form-label small fw-semibold text-body-secondary">
        Builder
      </label>
      <Select
        id="builderSelect"
        className="form-select"
        items={config.custom_environments.builders}
        value={state.builder}
        onChange={v => dispatch({ type: "setBuilder", builder: v })}
      />
    </>
  );
}
