import type { DynamicFormInfo, Domains, FormConfig } from "../config";
import {
  type Dispatch,
  type State,
  currentProfile,
  releaseGroupsForCard,
  SOURCE_CUSTOM,
} from "../state";
import { toggleTN } from "../url-params";
import { InfoTooltip } from "./InfoTooltip";
import { Select, type SelectItem } from "./Select";

interface Props {
  state: State;
  config: FormConfig;
  dynamic: DynamicFormInfo;
  domains: Domains;
  tnEnabled: boolean;
  dispatch: Dispatch;
}

const REPO_HTTP_RE =
  /^https?:\/\/(?:github\.com|gitlab\.cern\.ch)(?:\/[a-zA-Z0-9._-]+)+(?:\/|\.git)?$/;
const REPO_SSH_RE =
  /^(?:ssh:\/\/git@(?:gitlab\.cern\.ch)(?::\d+)?\/|git@github\.com:)(?:[a-zA-Z0-9._-]+\/)+[a-zA-Z0-9._-]+(?:\/|\.git)?$/;

function isRepoValid(v: string): boolean {
  return !v || REPO_HTTP_RE.test(v) || REPO_SSH_RE.test(v);
}

export function AdvancedPanel({
  state,
  config,
  domains,
  tnEnabled,
  dispatch,
}: Props) {
  const isCustom = state.source === SOURCE_CUSTOM;
  const showTnSection = !!config.features?.technical_network;

  return (
    <div className="card mb-3">
      <div
        role="button"
        className="card-header bg-body-tertiary py-2 px-3"
        onClick={() => dispatch({ type: "toggleAdvanced" })}
      >
        <div className="d-flex align-items-center justify-content-between">
          <span className="fw-semibold">
            <i className="fa fa-sliders me-2" />
            Customize settings
          </span>
          <i
            className={`fa fa-chevron-right small swan-chev ${state.advancedOpen ? "open" : ""}`}
          />
        </div>
      </div>

      {state.advancedOpen && (
        <div className="card-body p-3">
          <div className="row g-3">
            <SectionHeader title="Software stack" />
            {isCustom ? (
              <CustomEnvFields
                state={state}
                config={config}
                dispatch={dispatch}
              />
            ) : (
              <LcgReleaseFields
                state={state}
                config={config}
                dispatch={dispatch}
              />
            )}

            {!isCustom && <SectionHeader title="External computing" />}
            {!isCustom && (
              <ClusterField state={state} config={config} dispatch={dispatch} />
            )}
            {!isCustom && (
              <CondorField state={state} config={config} dispatch={dispatch} />
            )}

            {!isCustom && (
              <>
                <SectionHeader title="Data access" />
                <RucioFields
                  state={state}
                  config={config}
                  dispatch={dispatch}
                />
              </>
            )}

            {showTnSection && (
              <NetworkSection
                state={state}
                domains={domains}
                tnEnabled={tnEnabled}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  withDivider,
}: {
  title: string;
  withDivider?: boolean;
}) {
  return (
    <div className={`col-12 ${withDivider ? "border-top pt-3 mt-1" : ""}`}>
      <h6
        className="text-body-secondary text-uppercase small fw-semibold mb-0"
        style={{ letterSpacing: ".5px" }}
      >
        {title}
      </h6>
    </div>
  );
}

// ─── Software stack ────────────────────────────────────────────────────────

function LcgReleaseFields({
  state,
  config,
  dispatch,
}: {
  state: State;
  config: FormConfig;
  dispatch: Dispatch;
}) {
  const groups = releaseGroupsForCard(config, state.card);
  const items: SelectItem[] = groups.map((g) => ({
    group: g.label,
    items: g.releases.map((r) => ({
      value: r.value,
      label: r.label ?? r.value,
    })),
  }));

  return (
    <>
      <div className="col-sm-6">
        <label
          htmlFor="releaseSelect"
          className="form-label small fw-semibold text-body-secondary"
        >
          Release
          <InfoTooltip title="LCG software bundle. See lcginfo.cern.ch." />
        </label>
        <Select
          id="releaseSelect"
          className="form-select form-select-sm"
          items={items}
          value={state.release}
          onChange={(v) => dispatch({ type: "setRelease", release: v })}
        />
      </div>

      <div className="col-sm-6">
        <label
          htmlFor="scriptEnvInput"
          className="form-label small fw-semibold text-body-secondary"
        >
          Environment script
          <InfoTooltip title="Bash script with custom env vars. $CERNBOX_HOME resolves to /eos/user/u/username." />
        </label>
        <input
          id="scriptEnvInput"
          type="text"
          className="form-control form-control-sm"
          placeholder="$CERNBOX_HOME/MySWAN/myscript.sh"
          value={state.scriptEnv}
          onChange={(e) =>
            dispatch({ type: "setScriptEnv", value: e.target.value })
          }
        />
      </div>
    </>
  );
}

function CustomEnvFields({
  state,
  config,
  dispatch,
}: {
  state: State;
  config: FormConfig;
  dispatch: Dispatch;
}) {
  const builders: SelectItem[] = (
    config.custom_environments?.builders || []
  ).map((b) => ({
    value: b.value,
    label: b.label ?? b.value,
  }));
  const repoValid = isRepoValid(state.repository);

  return (
    <div className="col-12">
      <div className="row g-3">
        <div className="col-sm-6">
          <label
            htmlFor="builderSelect"
            className="form-label small fw-semibold text-body-secondary"
          >
            Builder
          </label>
          <Select
            id="builderSelect"
            className="form-select form-select-sm"
            items={builders}
            value={state.builder}
            onChange={(v) => dispatch({ type: "setBuilder", builder: v })}
          />
        </div>

        <div className="col-sm-6">
          <label
            htmlFor="repositoryInput"
            className="form-label small fw-semibold text-body-secondary"
          >
            Repository{" "}
            <span className="fw-normal text-body-tertiary">(optional)</span>
          </label>
          <input
            id="repositoryInput"
            type="text"
            className={`form-control form-control-sm ${repoValid ? "" : "is-invalid"}`}
            placeholder="https://gitlab.cern.ch/user/repo"
            value={state.repository}
            onChange={(e) =>
              dispatch({ type: "setRepository", value: e.target.value })
            }
          />
          {!repoValid && (
            <div className="invalid-feedback">
              The repository URL is not valid.
            </div>
          )}
          <div className="form-text">
            Git repo with a requirements file — leave empty for a blank
            environment.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── External computing ────────────────────────────────────────────────────

function ClusterField({
  state,
  config,
  dispatch,
}: {
  state: State;
  config: FormConfig;
  dispatch: Dispatch;
}) {
  const profile = currentProfile(config, state);
  const items = toItemsOrNone(profile?.clusters);
  return (
    <div className="col-sm-6">
      <label
        htmlFor="clusterSelect"
        className="form-label small fw-semibold text-body-secondary"
      >
        Spark cluster
        <InfoTooltip title="Spark cluster to connect to from notebooks." />
      </label>
      <Select
        id="clusterSelect"
        className="form-select form-select-sm"
        items={items}
        value={state.cluster}
        onChange={(v) => dispatch({ type: "setCluster", cluster: v })}
      />
    </div>
  );
}

function CondorField({
  state,
  config,
  dispatch,
}: {
  state: State;
  config: FormConfig;
  dispatch: Dispatch;
}) {
  const profile = currentProfile(config, state);
  const items = toItemsOrNone(profile?.condor);
  return (
    <div className="col-sm-6">
      <label
        htmlFor="condorSelect"
        className="form-label small fw-semibold text-body-secondary"
      >
        HTCondor pool
      </label>
      <Select
        id="condorSelect"
        className="form-select form-select-sm"
        items={items}
        value={state.condor}
        onChange={(v) => dispatch({ type: "setCondor", condor: v })}
      />
    </div>
  );
}

// ─── Data access (Rucio, LCG only) ─────────────────────────────────────────

function RucioFields({
  state,
  config,
  dispatch,
}: {
  state: State;
  config: FormConfig;
  dispatch: Dispatch;
}) {
  const instances = config.rucio?.instances || [];
  const instanceItems: SelectItem[] = instances.length
    ? instances.map((i) => ({ value: i.value, label: i.label }))
    : [{ value: "none", label: "None" }];

  const inst = instances.find((i) => i.value === state.rucio);
  const rseOpts = inst?.rse_options || [];
  const rseItems: SelectItem[] = rseOpts.length
    ? rseOpts.map((r) => ({ value: r.value, label: r.value }))
    : [{ value: "none", label: "None" }];

  return (
    <>
      <div className="col-sm-6">
        <label
          htmlFor="rucioSelect"
          className="form-label small fw-semibold text-body-secondary"
        >
          Rucio instance
          <InfoTooltip title="Rucio instance to connect to." />
        </label>
        <Select
          id="rucioSelect"
          className="form-select form-select-sm"
          items={instanceItems}
          value={state.rucio}
          onChange={(v) => dispatch({ type: "setRucio", rucio: v })}
        />
      </div>
      <div className="col-sm-6">
        <label
          htmlFor="rseSelect"
          className="form-label small fw-semibold text-body-secondary"
        >
          Rucio RSE
        </label>
        <Select
          id="rseSelect"
          className="form-select form-select-sm"
          items={rseItems}
          value={state.rucioRse}
          onChange={(v) => dispatch({ type: "setRucioRse", rse: v })}
          disabled={rseOpts.length === 0}
        />
      </div>
    </>
  );
}

// ─── Network (TN toggle) ───────────────────────────────────────────────────

interface NetworkProps {
  state: State;
  domains: Domains;
  tnEnabled: boolean;
}

function NetworkSection({ state, domains, tnEnabled }: NetworkProps) {
  return (
    <>
      <SectionHeader title="Network" />
      <div className="col-12 mt-2">
        <div className="form-check">
          <input
            id="useTnInput"
            type="checkbox"
            className="form-check-input"
            // Reflects which cluster we're on, not state.useTN — toggling
            // redirects to the other domain.
            checked={tnEnabled}
            onChange={(e) => toggleTN(state, domains, e.target.checked)}
          />
          <label htmlFor="useTnInput" className="form-check-label small">
            TN Access
            <InfoTooltip title="Session exposed to the CERN Technical Network." />
          </label>
        </div>
      </div>
    </>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function toItemsOrNone(
  vals: Array<{ value: string; label: string }> | undefined,
): SelectItem[] {
  if (!vals?.length) return [{ value: "none", label: "None" }];
  return vals.map((v) => ({ value: v.value, label: v.label }));
}
