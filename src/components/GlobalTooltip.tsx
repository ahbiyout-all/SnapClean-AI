import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface TooltipState {
  visible: boolean;
  content: string;
  title?: string;
  shortcut?: string;
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right";
}

export const GlobalTooltip: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: "",
    top: 0,
    left: 0,
    placement: "top",
  });

  const activeElementRef = useRef<HTMLElement | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleTrigger = (target: HTMLElement) => {
      // Extract content from data-tooltip, title, or data-original-title
      let content = target.getAttribute("data-tooltip");
      const nativeTitle = target.getAttribute("title");

      if (nativeTitle) {
        // Transfer native title to data-tooltip & data-original-title to suppress browser default tooltip
        content = nativeTitle;
        target.setAttribute("data-tooltip", nativeTitle);
        target.setAttribute("data-original-title", nativeTitle);
        target.removeAttribute("title");
      } else if (!content) {
        content = target.getAttribute("data-original-title");
      }

      if (!content || !content.trim()) return;

      const title = target.getAttribute("data-tooltip-title") || undefined;
      const shortcut = target.getAttribute("data-tooltip-shortcut") || undefined;
      const requestedSide = (target.getAttribute("data-tooltip-side") as any) || "top";

      activeElementRef.current = target;
      const rect = target.getBoundingClientRect();

      let placement: "top" | "bottom" | "left" | "right" = requestedSide;
      if (requestedSide === "top" && rect.top < 70) {
        placement = "bottom";
      } else if (requestedSide === "bottom" && window.innerHeight - rect.bottom < 70) {
        placement = "top";
      }

      let top = 0;
      let left = 0;

      switch (placement) {
        case "top":
          top = rect.top - 8;
          left = rect.left + rect.width / 2;
          break;
        case "bottom":
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2;
          left = rect.left - 8;
          break;
        case "right":
          top = rect.top + rect.height / 2;
          left = rect.right + 8;
          break;
      }

      // Keep within viewport horizontal boundaries
      const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
      const margin = 16;
      const halfWidth = 140;
      left = Math.max(margin + halfWidth, Math.min(screenWidth - margin - halfWidth, left));

      setTooltip({
        visible: true,
        content,
        title,
        shortcut,
        top,
        left,
        placement,
      });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.("[data-tooltip], [title], [data-original-title]") as HTMLElement | null;

      if (!target) {
        if (tooltip.visible && !hideTimeoutRef.current) {
          hideTimeoutRef.current = setTimeout(() => {
            setTooltip((prev) => ({ ...prev, visible: false }));
            activeElementRef.current = null;
            hideTimeoutRef.current = null;
          }, 40);
        }
        return;
      }

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      handleTrigger(target);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related && related.closest?.("[data-tooltip], [title], [data-original-title]")) return;

      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setTooltip((prev) => ({ ...prev, visible: false }));
        activeElementRef.current = null;
        hideTimeoutRef.current = null;
      }, 40);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = (e.target as HTMLElement)?.closest?.("[data-tooltip], [title], [data-original-title]") as HTMLElement | null;
      if (target) {
        handleTrigger(target);
        // Auto dismiss mobile tooltip after 2.5 seconds
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
          setTooltip((prev) => ({ ...prev, visible: false }));
          activeElementRef.current = null;
          hideTimeoutRef.current = null;
        }, 2500);
      } else {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    };

    const handleScrollOrResize = () => {
      if (!activeElementRef.current) return;
      const rect = activeElementRef.current.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      let top = rect.top - 8;
      let left = rect.left + rect.width / 2;
      const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
      const margin = 16;
      const halfWidth = 140;
      left = Math.max(margin + halfWidth, Math.min(screenWidth - margin - halfWidth, left));

      setTooltip((prev) => ({ ...prev, top, left }));
    };

    window.addEventListener("mouseover", handleMouseOver, true);
    window.addEventListener("mouseout", handleMouseOut, true);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("mouseover", handleMouseOver, true);
      window.removeEventListener("mouseout", handleMouseOut, true);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [tooltip.visible]);

  if (!tooltip.visible || !tooltip.content || typeof document === "undefined") {
    return null;
  }

  const tooltipElement = (
    <div
      style={{
        position: "fixed",
        top: tooltip.top,
        left: tooltip.left,
        transform:
          tooltip.placement === "top"
            ? "translate(-50%, -100%)"
            : tooltip.placement === "bottom"
            ? "translate(-50%, 0)"
            : tooltip.placement === "left"
            ? "translate(-100%, -50%)"
            : "translate(0, -50%)",
        maxWidth: 340,
        zIndex: 2147483647, // Maximum 32-bit Integer z-index to stay above all modals, overlays & inspector panes
        pointerEvents: "none",
      }}
      className="px-3.5 py-2.5 bg-slate-950/98 backdrop-blur-3xl border border-indigo-500/50 text-white rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.98)] text-xs select-none transition-opacity duration-100 ring-1 ring-white/10"
      role="tooltip"
    >
      {tooltip.title && (
        <div className="font-black text-indigo-300 flex items-center justify-between gap-2 border-b border-white/15 pb-1 mb-1.5 text-[11px] uppercase tracking-wider">
          <span>{tooltip.title}</span>
          {tooltip.shortcut && (
            <span className="bg-white/15 text-slate-200 font-mono px-1.5 py-0.2 rounded text-[9px]">
              {tooltip.shortcut}
            </span>
          )}
        </div>
      )}
      <div className="text-slate-100 text-[11px] leading-relaxed font-medium break-words">
        {tooltip.content}
      </div>

      {/* Pointer Micro Arrow */}
      {tooltip.placement === "top" && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-solid border-t-slate-950 border-t-5 border-x-transparent border-x-5 border-b-0" />
      )}
      {tooltip.placement === "bottom" && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-[1px] border-solid border-b-slate-950 border-b-5 border-x-transparent border-x-5 border-t-0" />
      )}
    </div>
  );

  return createPortal(tooltipElement, document.body);
};
