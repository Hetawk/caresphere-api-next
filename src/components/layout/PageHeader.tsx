import type { ReactNode, ElementType } from "react";
import { cn } from "@/lib/utils";

interface ActionProps {
  label: string;
  icon?: ElementType;
  onClick: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ActionProps;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 pb-5", className)}
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#1F1C18]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[rgba(26,26,26,0.55)]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action && (
          <button
            onClick={action.onClick}
            className="cs-btn-primary flex items-center gap-2"
          >
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
