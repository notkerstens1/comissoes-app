"use client";

import { Heart, MessageCircle, Share2, Bookmark, Eye, ThumbsUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface IGPost {
  id: string;
  tipo?: string;
  caption?: string | null;
  publishedAt: string;
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  reach?: number;
  engagement?: number;
  // YouTube fields
  titulo?: string;
  views?: number;
}

export function TopPostsGrid({ posts, platform }: { posts: IGPost[]; platform: "instagram" | "youtube" }) {
  if (!posts || posts.length === 0) {
    return (
      <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">
          {platform === "instagram" ? "Top Posts Instagram" : "Top Videos YouTube"}
        </h3>
        <p className="text-gray-500 text-sm">Nenhum conteudo no periodo</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1f2e] border border-[#232a3b] rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">
        {platform === "instagram" ? "Top Posts Instagram" : "Top Videos YouTube"}
      </h3>
      <div className="space-y-3">
        {posts.slice(0, 5).map((post, i) => (
          <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#0b0f19] border border-[#232a3b]/50">
            <span className="text-xs text-gray-500 font-mono w-5">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate">
                {platform === "instagram"
                  ? post.caption || `Post ${post.tipo || ""}`
                  : post.titulo || "Video"}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {new Date(post.publishedAt).toLocaleDateString("pt-BR")}
              </p>
              <div className="flex gap-3 mt-2">
                {platform === "instagram" ? (
                  <>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Heart className="w-3 h-3 text-red-400" /> {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MessageCircle className="w-3 h-3 text-blue-400" /> {formatNumber(post.comments)}
                    </span>
                    {post.shares != null && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Share2 className="w-3 h-3 text-purple-400" /> {formatNumber(post.shares)}
                      </span>
                    )}
                    {post.saves != null && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Bookmark className="w-3 h-3 text-amber-400" /> {formatNumber(post.saves)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Eye className="w-3 h-3 text-red-400" /> {formatNumber(post.views || 0)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <ThumbsUp className="w-3 h-3 text-blue-400" /> {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MessageCircle className="w-3 h-3 text-teal-400" /> {formatNumber(post.comments)}
                    </span>
                  </>
                )}
              </div>
            </div>
            {post.engagement != null && (
              <span className="text-xs text-lime-400 font-medium">{post.engagement}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
