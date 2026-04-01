"use client";

import { Instagram, Youtube, Users, Eye, Heart, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface Props {
  instagram: {
    seguidores: number;
    novosSeguidores: number;
    reachTotal: number;
    postsPublicados: number;
    crescimentoSeguidores: number;
  };
  youtube: {
    inscritos: number;
    novosInscritos: number;
    viewsTotal: number;
    videosPublicados: number;
    crescimentoInscritos: number;
  };
}

export function SocialSummaryCards({ instagram, youtube }: Props) {
  const cards = [
    { label: "Seguidores IG", value: formatNumber(instagram.seguidores), delta: `+${instagram.novosSeguidores}`, icon: Instagram, color: "text-pink-400" },
    { label: "Reach IG", value: formatNumber(instagram.reachTotal), delta: null, icon: Eye, color: "text-purple-400" },
    { label: "Posts IG", value: String(instagram.postsPublicados), delta: null, icon: Heart, color: "text-rose-400" },
    { label: "Inscritos YT", value: formatNumber(youtube.inscritos), delta: `+${youtube.novosInscritos}`, icon: Youtube, color: "text-red-500" },
    { label: "Views YT", value: formatNumber(youtube.viewsTotal), delta: null, icon: Eye, color: "text-red-400" },
    { label: "Videos YT", value: String(youtube.videosPublicados), delta: null, icon: TrendingUp, color: "text-orange-400" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {cards.map((card) => (
        <div key={card.label} className="flex-shrink-0 min-w-[130px] bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <card.icon className={`w-4 h-4 ${card.color}`} />
            <span className="text-xs text-gray-400">{card.label}</span>
          </div>
          <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
          {card.delta && <p className="text-xs text-lime-400 mt-1">{card.delta}</p>}
        </div>
      ))}
    </div>
  );
}
