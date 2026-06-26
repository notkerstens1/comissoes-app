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
      <div className="bg-liv-surface border border-liv-line rounded-xl p-5">
        <h3 className="text-liv-ink font-semibold mb-4">
          {platform === "instagram" ? "Top Posts Instagram" : "Top Videos YouTube"}
        </h3>
        <p className="text-liv-faint text-sm">Nenhum conteudo no periodo</p>
      </div>
    );
  }

  return (
    <div className="bg-liv-surface border border-liv-line rounded-xl p-5">
      <h3 className="text-liv-ink font-semibold mb-4">
        {platform === "instagram" ? "Top Posts Instagram" : "Top Videos YouTube"}
      </h3>
      <div className="space-y-3">
        {posts.slice(0, 5).map((post, i) => (
          <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg bg-liv-surface-2 border border-liv-line/50">
            <span className="text-xs text-liv-faint font-mono w-5">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-liv-ink text-sm truncate">
                {platform === "instagram"
                  ? post.caption || `Post ${post.tipo || ""}`
                  : post.titulo || "Video"}
              </p>
              <p className="text-[10px] text-liv-faint mt-0.5">
                {new Date(post.publishedAt).toLocaleDateString("pt-BR")}
              </p>
              <div className="flex gap-3 mt-2">
                {platform === "instagram" ? (
                  <>
                    <span className="flex items-center gap-1 text-xs text-liv-muted">
                      <Heart className="w-3 h-3 text-liv-danger" /> {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-liv-muted">
                      <MessageCircle className="w-3 h-3 text-liv-info" /> {formatNumber(post.comments)}
                    </span>
                    {post.shares != null && (
                      <span className="flex items-center gap-1 text-xs text-liv-muted">
                        <Share2 className="w-3 h-3 text-liv-violet" /> {formatNumber(post.shares)}
                      </span>
                    )}
                    {post.saves != null && (
                      <span className="flex items-center gap-1 text-xs text-liv-muted">
                        <Bookmark className="w-3 h-3 text-liv-gold" /> {formatNumber(post.saves)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-xs text-liv-muted">
                      <Eye className="w-3 h-3 text-liv-danger" /> {formatNumber(post.views || 0)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-liv-muted">
                      <ThumbsUp className="w-3 h-3 text-liv-info" /> {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-liv-muted">
                      <MessageCircle className="w-3 h-3 text-liv-teal" /> {formatNumber(post.comments)}
                    </span>
                  </>
                )}
              </div>
            </div>
            {post.engagement != null && (
              <span className="text-xs text-liv-sage font-medium">{post.engagement}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
