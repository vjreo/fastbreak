"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * M3-style filter chips for selecting/filtering content.
 * @see https://m3.material.io/components/chips/guidelines
 */
const chipVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        /** Unselected filter chip - outlined, subtle */
        outline:
          "border bg-transparent text-foreground hover:bg-muted/60 border-input",
        /** Selected filter chip - filled, emphasized */
        filled:
          "border border-transparent bg-primary/20 text-primary border-primary/30 hover:bg-primary/30",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-9 px-4",
        lg: "h-10 px-5",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  }
);

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof chipVariants> {
  selected?: boolean;
  children: React.ReactNode;
}

function Chip({
  className,
  variant,
  size,
  selected = false,
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      data-state={selected ? "selected" : "unselected"}
      className={cn(
        chipVariants({
          variant: selected ? "filled" : variant ?? "outline",
          size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export { Chip, chipVariants };
