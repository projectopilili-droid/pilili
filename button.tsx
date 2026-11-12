import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[opacity,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
  {
    variants: {
      variant: {
        gold: "bg-gold text-gold-fg shadow-[var(--shadow-gold)] hover:opacity-95",
        ghost: "bg-transparent text-fg hover:bg-elevated",
        line: "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-elevated hover:shadow-[var(--shadow-border-hover)]",
        quiet: "bg-elevated text-fg hover:bg-elevated/80",
        danger: "bg-danger text-fg",
      },
      size: {
        sm: "h-9 px-3 text-sm rounded-[10px]",
        md: "h-11 px-4 text-sm rounded-xl",
        lg: "h-12 px-5 text-base rounded-2xl",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: { variant: "gold", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
