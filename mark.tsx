import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "hero";
}) {
  const h =
    size === "hero" ? "h-20 sm:h-24" : size === "lg" ? "h-14" : size === "sm" ? "h-8" : "h-10";
  return (
    <img
      src="/brand/logo.png"
      alt="PILILÍ: Tudo fica mais fácil"
      className={cn("w-auto object-contain", h, className)}
    />
  );
}

export function PililiMark({ className }: { className?: string }) {
  return <BrandLogo size="sm" className={className} />;
}

export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <BrandLogo size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"} />;
}
