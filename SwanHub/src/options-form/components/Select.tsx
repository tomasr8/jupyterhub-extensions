import type { SelectHTMLAttributes } from 'react';

export interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface OptionGroup {
  group: string;
  items: Option[];
}

export type SelectItem = Option | OptionGroup;

function isGroup(item: SelectItem): item is OptionGroup {
  return (item as OptionGroup).group !== undefined;
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  items: SelectItem[];
  value: string | number | null;
  onChange: (value: string) => void;
}

export function Select({ items, value, onChange, ...rest }: Props) {
  return (
    <select
      value={value == null ? '' : String(value)}
      onChange={e => onChange(e.target.value)}
      {...rest}
    >
      {items.map((item, i) =>
        isGroup(item) ? (
          <optgroup key={`g-${item.group}-${i}`} label={item.group}>
            {item.items.map(opt => (
              <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ) : (
          <option key={`${String(item.value)}-${i}`} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ),
      )}
    </select>
  );
}
