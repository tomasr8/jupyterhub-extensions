import { type CardId, type Dispatch, type State } from "../state";

interface CardDef {
  id: CardId;
  icon: string;
  iconColor: string;
  title: string;
  blurb: string;
}

const CARDS: CardDef[] = [
  {
    id: "general",
    icon: "fa-flask",
    iconColor: "text-primary",
    title: "General analysis",
    blurb: "Curated LCG stack with Python, ROOT and more",
  },
  {
    id: "cuda",
    icon: "fa-bolt",
    iconColor: "text-warning",
    title: "GPU computing",
    blurb: "CUDA-enabled stack for ML training and inference",
  },
  {
    id: "nxcals",
    icon: "fa-database",
    iconColor: "text-info",
    title: "NXCALS",
    blurb: "NXCALS with a pre-configured Spark cluster",
  },
  {
    id: "customenv",
    icon: "fa-wrench",
    iconColor: "text-secondary",
    title: "Custom environment",
    blurb: "Bring your own packages via venv or mamba",
  },
];

interface Props {
  state: State;
  dispatch: Dispatch;
}

export function WorkflowCards({ state, dispatch }: Props) {
  return (
    <div className="row row-cols-2 g-2 mb-4">
      {CARDS.map(card => {
        const active = state.card === card.id;
        return (
          <div key={card.id} className="col">
            <div
              role="button"
              className={`swan-card card p-3 ${active ? "active" : ""}`}
              onClick={() => dispatch({ type: "pickCard", card: card.id })}
            >
              <div className="d-flex align-items-center gap-2 mb-2">
                <i className={`fa ${card.icon} ${card.iconColor}`} />
                <span className="fw-semibold">{card.title}</span>
              </div>
              <div className="text-body-secondary small">{card.blurb}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
