import {
  Briefcase,
  Brain,
  GraduationCap,
  Hammer,
  Heart,
  Music,
  Palette,
  FileBadge,
  Globe,
  Sprout,
  TrendingUp,
  Zap,
  BookOpen,
  Microscope,
  type LucideIcon,
} from "lucide-react";
import type { PowerDef } from "@/lib/pilili/powers";
import type { PowerId } from "@/lib/pilili/types";

const ICONS: Record<PowerId, LucideIcon> = {
  vida: Heart,
  negocio: TrendingUp,
  emprego: Briefcase,
  estuda: GraduationCap,
  burocracia: FileBadge,
  entende: Brain,
  estudio: Palette,
  digital: Globe,
  constroi: Hammer,
  agri: Sprout,
  executar: Zap,
  dj: Music,
  prof: BookOpen,
  investiga: Microscope,
};

export function PowerHero({ power }: { power: PowerDef }) {
  const Icon = ICONS[power.id];
  return (
    <div className="relative isolate overflow-hidden rounded-3xl">
      {power.id === "dj" || power.id === "estudio" ? (
        <video
          src={power.id === "dj" ? "/powers/dj.mp4" : "/powers/estudio.mp4"}
          poster={power.image}
          autoPlay
          muted
          loop
          playsInline
          className={`h-80 w-full object-cover sm:h-96 ${power.id === "estudio" ? "object-center" : "object-[50%_30%]"}`}
        />
      ) : (
        <img
          src={power.image}
          alt=""
          decoding="async"
          fetchPriority="high"
          className="h-80 w-full object-cover object-[50%_30%] sm:h-96"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
        <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gold-bright">
          <span className="grid size-8 place-items-center rounded-full bg-gold/25 text-gold shadow-[var(--shadow-gold)]">
            <Icon className="size-4" />
          </span>
          Super poder
        </p>
        <h1 className="hero-copy mt-2 font-display text-4xl font-semibold tracking-tight">{power.name}</h1>
      </div>
    </div>
  );
}
