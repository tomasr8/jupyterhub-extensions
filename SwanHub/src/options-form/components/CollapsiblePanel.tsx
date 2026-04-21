import { useState } from "react";

export function CollapsiblePanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card mb-3" style={{ overflow: "hidden" }}>
      <div
        role="button"
        className="card-header bg-body-tertiary py-2 px-3"
        style={open ? {} : { borderBottom: "none" }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="d-flex align-items-center justify-content-between">
          <span className="fw-semibold">
            <i className={`fa ${icon} me-2`} />
            {title}
          </span>
          <i className={`fa fa-chevron-right small swan-chev ${open ? "open" : ""}`} />
        </div>
      </div>

      {open && <div className="card-body p-3">{children}</div>}
    </div>
  );
}
