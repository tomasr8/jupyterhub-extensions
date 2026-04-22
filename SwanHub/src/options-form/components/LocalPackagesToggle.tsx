import { type Dispatch, type State } from '../state';
import { InfoTooltip } from './InfoTooltip';

interface Props {
  state: State;
  dispatch: Dispatch;
}

export function LocalPackagesToggle({ state, dispatch }: Props) {
  return (
    <div className="form-check mb-4">
      <input
        id="useLocalPackagesInput"
        type="checkbox"
        className="form-check-input"
        checked={state.useLocalPackages}
        onChange={e => dispatch({ type: 'setUseLocalPackages', value: e.target.checked })}
      />
      <label htmlFor="useLocalPackagesInput" className="form-check-label">
        Use Python packages installed on CERNBox
        <InfoTooltip title="Appends your CERNBox-installed Python packages to PYTHONPATH." />
      </label>
    </div>
  );
}
