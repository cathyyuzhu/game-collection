import * as React from "react";
import { cn } from "@/lib/utils";

export function Select<T extends string>({
  value,
  onChange,
  options,
  className
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-background px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-purple dark:border-slate-700",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
