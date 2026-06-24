import { useState } from "react";

export function Form() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <div>
        <div className="mb-4">
          <h2 className="mb-0 text-center">New notebook</h2>
        </div>
        <KubeflowForm />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="mb-0 text-center">Configure your session</h2>
      </div>
      <div className="d-flex justify-content-center gap-5">
        <Swan />
        <Kubeflow setShowForm={setShowForm} />
      </div>
    </div>
  );
}

function KubeflowForm() {
  return (
    <form>
      <div className="mb-3">
        <input type="text" className="form-control" placeholder="Name" />
      </div>
      <div className="mb-3" style={{ display: "flex", gap: 10, justifyContent: "space-evenly" }}>
        <IdeCard
          title="JupyterLab"
          imageUrl="/hub/static/swan/logos/jupyterlab.svg"
          description={
            "An interactive development environment for notebooks, code, and data. Ideal for prototyping and experimentation. "
          }
        />
        <IdeCard
          title="VS Code"
          imageUrl="/hub/static/swan/logos/vscode.png"
          description={
            " A lightweight but powerful source code editor, redefined and optimized for building and debugging modern web and cloud applications. "
          }
        />
        <IdeCard
          title="RStudio"
          imageUrl="/hub/static/swan/logos/rstudio.png"
          description={
            "An integrated development environment for R, a programming language for statistical computing and graphics. "
          }
        />
      </div>
      <div className="mb-3">
        <div className="accordion" id="accordionExample">
          <div className="accordion-item">
            <h2 className="accordion-header">
              <button
                className="accordion-button"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#collapseOne"
                aria-expanded="false"
                aria-controls="collapseOne"
              >
                Custom Notebook
              </button>
            </h2>
            <div id="collapseOne" className="accordion-collapse collapse" data-bs-parent="#accordionExample">
              <div className="accordion-body">
                <select className="form-select" aria-label="Default select example">
                  <option selected> kubeflow/kubeflownotebookswg/jupyter-scipy:v1.9.2 </option>
                  <option value="1">kubeflow/kubeflownotebookswg/jupyter-pytorch-full:v1.9.2 </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-3">
        <h4>CPU / RAM</h4>
        <div className="row">
          <div className="col">
            <input type="number" className="form-control" placeholder="Minimum CPU" />
          </div>
          <div className="col">
            <input type="number" className="form-control" placeholder="Minimum Memory" />
          </div>
        </div>
      </div>
      <div className="mb-3">
        <h4>GPUs</h4>
        <div className="row">
          <div className="col">
            <input type="number" className="form-control" placeholder="Number of GPUs" />
          </div>
          <div className="col">
            <input type="text" className="form-control" placeholder="GPU Vendor" />
          </div>
        </div>
      </div>
      <div className="mb-3">
        <h4>Workspace Volume</h4>
        <p>Volume that will be mounted in your home directory.</p>
        <div style={{ display: "flex", gap: 20, justifyContent: "flex-start" }}>
          <button type="button" className="btn btn-outline-primary">
            + Add new volume
          </button>
          <button type="button" className="btn btn-outline-primary">
            + Attach existing volume
          </button>
        </div>
      </div>
      <div className="mb-5">
        <h4>Data Volumes </h4>
        <p>Additional volumes that will be mounted in your Notebook.</p>
        <div style={{ display: "flex", gap: 20, justifyContent: "flex-start" }}>
          <button type="button" className="btn btn-outline-primary">
            + Add new volume
          </button>
          <button type="button" className="btn btn-outline-primary">
            + Attach existing volume
          </button>
        </div>
      </div>
      <div className="text-center mb-3">
        <button type="submit" className="btn btn-primary btn-lg">
          Launch notebook on Kubeflow
        </button>
      </div>
    </form>
  );
}

function IdeCard({ title, description, imageUrl }) {
  return (
    <div className="card text-center" style={{ cursor: "pointer", flex: "1" }}>
      <div className="p-3" style={{ height: 200, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <img src={imageUrl} alt={title} style={{ alignSelf: "center", width: "80%" }} />
      </div>
      <div className="card-body">
        <h5 className="card-title pt-3">{title}</h5>
        {description && <p className="card-text">{description}</p>}
      </div>
    </div>
  );
}

function Swan() {
  return (
    <div className="card p-4 text-center" style={{ width: "18rem", cursor: "pointer" }}>
      <img
        src="/hub/static/swan/logos/logo_swan_letters.png"
        className="card-img-top"
        alt="Swan Logo"
        style={{ maxHeight: 206 }}
      />
      <div className="card-body">
        <h5 className="card-title pt-3">SWAN notebook</h5>
        {/* <p className="card-text">Start a SWAN session</p> */}
      </div>
    </div>
  );
}

function Kubeflow({ setShowForm }) {
  return (
    <div
      className="card p-4 text-center"
      style={{ width: "18rem", cursor: "pointer" }}
      onClick={() => setShowForm(true)}
    >
      <img
        src="/hub/static/swan/logos/kubeflow.svg"
        className="card-img-top"
        alt="Kubeflow Logo"
        style={{ maxHeight: 206 }}
      />
      <div className="card-body">
        <h5 className="card-title pt-3">Kubeflow notebook</h5>
        {/* <p className="card-text">Start a notebook on ml.cern.ch</p> */}
      </div>
    </div>
  );
}
