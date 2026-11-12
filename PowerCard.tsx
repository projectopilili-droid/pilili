import { Link } from "@tanstack/react-router";
import type { PowerDef } from "@/lib/pilili/powers";

export function PowerCard({ power }: { power: PowerDef }) {
  return (
    <Link
      to="/poderes/$slug"
      params={{ slug: power.id }}
      aria-label={`${power.name}. ${power.tagline}`}
      className="group block overflow-hidden rounded-2xl active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={power.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="font-display text-lg font-semibold leading-tight">{power.name}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-gold-bright">{power.tagline}</p>
        </div>
      </div>
    </Link>
  );
}
