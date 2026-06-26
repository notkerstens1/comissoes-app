import * as React from "react";
import { Crown, Medal } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

type AvatarTone = "neutral" | "gold" | "sage";

interface AvatarProps {
  name: string;
  rank?: number;
  size?: number;
  tone?: AvatarTone;
  className?: string;
}

const toneClasses: Record<AvatarTone, string> = {
  neutral: "bg-liv-surface-2 text-liv-muted ring-1 ring-liv-line",
  gold: "bg-liv-gold/12 text-liv-gold ring-1 ring-liv-gold/30",
  sage: "bg-liv-sage/14 text-liv-sage ring-1 ring-liv-sage/30",
};

export function Avatar({ name, rank, size = 42, tone = "neutral", className }: AvatarProps) {
  const iconSize = Math.round(size * 0.42);
  const content =
    rank === 1 ? <Crown style={{ width: iconSize, height: iconSize }} /> :
    rank === 2 || rank === 3 ? <Medal style={{ width: iconSize, height: iconSize }} /> :
    <span className="font-bold" style={{ fontSize: Math.round(size * 0.36) }}>{getInitials(name)}</span>;

  return (
    <div
      role="img"
      aria-label={name}
      className={cn("grid shrink-0 place-items-center rounded-full", toneClasses[tone], className)}
      style={{ width: size, height: size }}
    >
      {content}
    </div>
  );
}
