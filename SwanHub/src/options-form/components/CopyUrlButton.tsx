import { useState } from 'react';
import { copyUrlToClipboard } from '../url-params';
import { type State } from '../state';

export function CopyUrlButton({ state }: { state: State }) {
  const [label, setLabel] = useState('Copy URL');
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      onClick={() => copyUrlToClipboard(state, setLabel)}
    >
      <i className="fa fa-link me-1" />{label}
    </button>
  );
}
