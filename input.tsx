import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const field =
  "w-full rounded-xl bg-elevated text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-subtle transition-[box-shadow] duration-150 focus:shadow-[var(--shadow-border-hover)]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-11 px-3.5", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(field, "min-h-24 resize-y px-3.5 py-3", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(field, "h-11 px-3.5", className)} {...props} />
  );
}
