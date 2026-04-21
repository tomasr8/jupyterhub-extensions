import { type Dispatch, type State, interfaceLocked } from "../state";

interface Props {
  state: State;
  dispatch: Dispatch;
}

export function InterfaceToggle({ state, dispatch }: Props) {
  return (
    <div>
      <h6 className="text-body-secondary text-uppercase small fw-semibold mb-2" style={{ letterSpacing: ".5px" }}>
        User Interface
      </h6>
      <div className="d-flex btn-group mb-4">
        <InterfaceButton
          label="Notebook Classic"
          icon="fa-book"
          active={state.uiInterface === "classic"}
          disabled={interfaceLocked(state)}
          onClick={() => dispatch({ type: "setInterface", intf: "classic" })}
        />
        <InterfaceButton
          label="JupyterLab"
          icon="fa-th-large"
          active={state.uiInterface === "lab"}
          onClick={() => dispatch({ type: "setInterface", intf: "lab" })}
        />
      </div>
    </div>
  );
}

function InterfaceButton({
  label,
  icon,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`swan-intf-btn btn btn-outline-secondary d-flex align-items-center gap-2 py-2 px-3 ${active ? "active" : ""}`}
      style={{ width: "50%", cursor: disabled ? "not-allowed" : "pointer" }}
      disabled={disabled}
      onClick={onClick}
    >
      <i className={`fa ${icon}`} /> {label}
    </button>
  );
}
