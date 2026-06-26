import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-liv-faint">{eyebrow}</p>
        )}
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-liv-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-liv-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
