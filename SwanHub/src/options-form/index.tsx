// Entry point. Reads server-provided JSON blobs, mounts <App /> into the
// host div. Loaded via <script type="module"> at the bottom of SwanHub's
// spawn.html.

import { createRoot } from 'react-dom/client';
import { App } from './App';
import type { DynamicFormInfo, Domains, FormConfig } from './config';
import './styles.css';

function readJsonScript<T>(id: string): T {
  const el = document.getElementById(id);
  if (!el || !el.textContent) throw new Error(`Missing data script: #${id}`);
  return JSON.parse(el.textContent) as T;
}

function init(): void {
  const mount = document.getElementById('swan-options-form');
  if (!mount) throw new Error('Mount point #swan-options-form not found');

  const config    = readJsonScript<FormConfig>('swan-options-form-config');
  const dynamic   = readJsonScript<DynamicFormInfo>('swan-options-form-dynamic');
  const domains   = readJsonScript<Domains>('swan-options-form-domains');
  const tnEnabled = readJsonScript<boolean>('swan-options-form-tn-enabled');

  const root = createRoot(mount);
  root.render(<App config={config} dynamic={dynamic} domains={domains} tnEnabled={tnEnabled} />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
