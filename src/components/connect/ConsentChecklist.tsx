import { useId } from "react";

export interface ConsentItem {
  key: string;
  label: string;
}

interface Props {
  items: ConsentItem[];
  values: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Small stacked consent checklist (16px boxes, 12px text).
 * Pure presentational + controlled — does not persist anything.
 */
const ConsentChecklist = ({ items, values, onChange, disabled, className }: Props) => {
  const baseId = useId();

  const toggle = (key: string) => {
    if (disabled) return;
    onChange({ ...values, [key]: !values[key] });
  };

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {items.map((item) => {
        const id = `${baseId}-${item.key}`;
        const checked = !!values[item.key];
        return (
          <label
            key={item.key}
            htmlFor={id}
            className={`flex items-start gap-2 cursor-pointer select-none ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <input
              id={id}
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(item.key)}
              className="mt-[2px] w-4 h-4 rounded border-input accent-primary cursor-pointer"
            />
            <span className="text-[12px] leading-snug text-muted-foreground">{item.label}</span>
          </label>
        );
      })}
    </div>
  );
};

export const allChecked = (items: ConsentItem[], values: Record<string, boolean>) =>
  items.every((i) => values[i.key]);

export default ConsentChecklist;
