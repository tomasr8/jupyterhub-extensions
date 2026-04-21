import { useEffect, useMemo, useReducer } from "react";
import type { DynamicFormInfo, FormConfig } from "./config";
import { buildPayload } from "./payload";
import { makeReducer } from "./state";
import { stateFromUrl } from "./url-params";

import { AdvancedPanel } from "./components/AdvancedPanel";
import { CopyUrlButton } from "./components/CopyUrlButton";
import { IntegrationsPanel } from "./components/IntegrationsPanel";
import { InterfaceToggle } from "./components/InterfaceToggle";
import { LocalPackagesToggle } from "./components/LocalPackagesToggle";
import { ResourcesPanel } from "./components/ResourcesPanel";
import { WorkflowCards } from "./components/WorkflowCards";
import { CustomEnvPanel } from "./components/CustomEnvPanel";

export function SpawnForm({ config, dynamic }: { config: FormConfig; dynamic: DynamicFormInfo }) {
  const reducer = useMemo(() => makeReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, undefined, () => stateFromUrl(config));

  useEffect(() => {
    // Strip query string from URL on mount
    history.replaceState(null, "", location.pathname);
  }, []);

  // Form submission goes through the single hidden 'payload' input.
  // Derived on every render; parent <form> posts it along with other fields.
  const payload = useMemo(() => JSON.stringify(buildPayload(state)), [state]);
  const isCustom = state.source === "customenv";

  return (
    <>
      <input type="hidden" id="payload" name="payload" value={payload} />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Configure your session</h2>
        <CopyUrlButton state={state} />
      </div>

      <WorkflowCards state={state} dispatch={dispatch} />
      <InterfaceToggle state={state} dispatch={dispatch} />
      <ResourcesPanel state={state} config={config} dynamic={dynamic} dispatch={dispatch} />
      {isCustom && <CustomEnvPanel state={state} config={config} dispatch={dispatch} />}
      {!isCustom && <IntegrationsPanel state={state} config={config} dynamic={dynamic} dispatch={dispatch} />}
      {!isCustom && <AdvancedPanel state={state} config={config} dynamic={dynamic} dispatch={dispatch} />}
      {!isCustom && <LocalPackagesToggle state={state} dispatch={dispatch} />}
      <SubmitButton />
    </>
  );
}

function SubmitButton() {
  return (
    <div className="w-100 text-center mt-4">
      <button type="submit" id="spawn" className="btn btn-default btn-primary btn-lg w-100">
        <span>
          <i className="fa fa-rocket me-1"></i>
          Start new session
        </span>
      </button>
    </div>
  );
}
