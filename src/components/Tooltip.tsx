import React from "react";
import { HelpCircle, Info } from "lucide-react";

export interface TooltipProps {
  content: React.ReactNode;
  title?: string;
  shortcut?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delayMs?: number;
  maxWidth?: string | number;
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  title,
  shortcut,
  side = "top",
  children,
  className = "",
  disabled = false,
}) => {
  if (disabled || !content) {
    return <>{children}</>;
  }

  const contentStr = typeof content === "string" ? content : (title || "");
  const titleStr = title || (typeof content !== "string" ? "정보" : undefined);

  if (React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      "data-tooltip": contentStr,
      "data-tooltip-title": titleStr,
      "data-tooltip-side": side,
      "data-tooltip-shortcut": shortcut,
      className: `${child.props.className || ""} ${className}`.trim(),
    });
  }

  return (
    <span
      data-tooltip={contentStr}
      data-tooltip-title={titleStr}
      data-tooltip-side={side}
      data-tooltip-shortcut={shortcut}
      className={`inline-flex items-center ${className}`}
    >
      {children}
    </span>
  );
};

export interface InfoTooltipProps {
  title?: string;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  icon?: "info" | "help";
  size?: number;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  content,
  side = "top",
  icon = "info",
  size = 14,
  className = "",
}) => {
  const contentStr = typeof content === "string" ? content : (title || "");
  const titleStr = title || (typeof content !== "string" ? "정보" : undefined);

  return (
    <button
      type="button"
      data-tooltip={contentStr}
      data-tooltip-title={titleStr}
      data-tooltip-side={side}
      className={`text-slate-400 hover:text-indigo-400 p-0.5 rounded-full hover:bg-white/10 transition-colors cursor-help inline-flex items-center justify-center shrink-0 ${className}`}
      aria-label={title || "Information"}
      onClick={(e) => e.stopPropagation()}
    >
      {icon === "info" ? <Info size={size} /> : <HelpCircle size={size} />}
    </button>
  );
};
