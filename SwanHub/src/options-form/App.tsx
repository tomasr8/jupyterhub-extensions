import { useMemo, useReducer } from "react";
import type { DynamicFormInfo, Domains, FormConfig } from "./config";
import { buildPayload } from "./payload";
import { makeReducer, SOURCE_CUSTOM } from "./state";
import { stateFromUrl } from "./url-params";

import { AdvancedPanel } from "./components/AdvancedPanel";
import { CopyUrlButton } from "./components/CopyUrlButton";
import { InterfaceToggle } from "./components/InterfaceToggle";
import { LocalPackagesToggle } from "./components/LocalPackagesToggle";
import { SummaryStrip } from "./components/SummaryStrip";
import { WorkflowCards } from "./components/WorkflowCards";

export interface AppProps {
  config: FormConfig;
  dynamic: DynamicFormInfo;
  domains: Domains;
  tnEnabled: boolean;
}

export function App({ config, dynamic, domains, tnEnabled }: AppProps) {
  const features = config.features || {};
  const customEnabled = features.custom_environments === true;

  const reducer = useMemo(() => makeReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    stateFromUrl(config, customEnabled),
  );

  // Form submission goes through the single hidden 'payload' input.
  // Derived on every render; parent <form> posts it along with other fields.
  const payload = useMemo(() => JSON.stringify(buildPayload(state)), [state]);
  const isCustom = state.source === SOURCE_CUSTOM;

  return (
    <>
      <input type="hidden" id="payload" name="payload" value={payload} />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Configure your session</h2>
        {features.generate_url && <CopyUrlButton state={state} />}
      </div>

      <WorkflowCards
        state={state}
        dispatch={dispatch}
        customEnabled={customEnabled}
      />
      <InterfaceToggle state={state} dispatch={dispatch} />
      <SummaryStrip
        state={state}
        config={config}
        dynamic={dynamic}
        dispatch={dispatch}
      />

      {!isCustom && <LocalPackagesToggle state={state} dispatch={dispatch} />}

      <AdvancedPanel
        state={state}
        config={config}
        dynamic={dynamic}
        domains={domains}
        tnEnabled={tnEnabled}
        dispatch={dispatch}
      />
    </>
  );
}
