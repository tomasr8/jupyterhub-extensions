import {
  type Dispatch,
  type State,
  INTF_CLASSIC,
  INTF_LAB,
  interfaceLocked,
} from "../state";

interface Props {
  state: State;
  dispatch: Dispatch;
}

const TOGGLES = [
  { id: "classic", icon: "fa-book", label: "Notebook Classic" },
  { id: "lab", icon: "fa-th-large", label: "JupyterLab" },
];

export function InterfaceToggle({ state, dispatch }: Props) {
  const locked = interfaceLocked(state);
  return (
    <div>
      <h6
        className="text-body-secondary text-uppercase small fw-semibold mb-2"
        style={{ letterSpacing: ".5px" }}
      >
        User Interface
      </h6>
      <div className="d-flex btn-group mb-4">
        {TOGGLES.map((t) => {
          const active = state.uiInterface === t.id;
          const disabled = locked && !active;
          return (
            <button
              key={t.id}
              type="button"
              className={`btn btn-outline-primary d-flex align-items-center gap-2 py-2 px-3 ${active ? "active" : ""}`}
              style={{ width: "50%" }}
              disabled={disabled}
              onClick={() =>
                dispatch({
                  type: "setInterface",
                  intf: t.id === "classic" ? INTF_CLASSIC : INTF_LAB,
                })
              }
            >
              <i className={`fa ${t.icon}`} /> {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
