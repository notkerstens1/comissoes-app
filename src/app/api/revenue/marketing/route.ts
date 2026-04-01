import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";

// GET /api/revenue/marketing — Dados da aba Marketing & Conteudo
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate e endDate obrigatorios" }, { status: 400 });
  }

  const [
    igDaily,
    igPosts,
    ytDaily,
    ytVideos,
    trafficRecords,
  ] = await Promise.all([
    prisma.instagramDaily.findMany({
      where: { data: { gte: startDate, lte: endDate } },
      orderBy: { data: "asc" },
    }),
    prisma.instagramPost.findMany({
      where: { publishedAt: { gte: new Date(startDate), lte: new Date(endDate) } },
      orderBy: { engagement: "desc" },
      take: 10,
    }),
    prisma.youTubeDaily.findMany({
      where: { data: { gte: startDate, lte: endDate } },
      orderBy: { data: "asc" },
    }),
    prisma.youTubeVideo.findMany({
      where: { publishedAt: { gte: new Date(startDate), lte: new Date(endDate) } },
      orderBy: { views: "desc" },
      take: 10,
    }),
    prisma.dailyTraffic.findMany({
      where: { data: { gte: startDate, lte: endDate } },
      orderBy: { data: "asc" },
    }),
  ]);

  // KPIs Instagram
  const lastIg = igDaily[igDaily.length - 1];
  const firstIg = igDaily[0];
  const igKpis = {
    seguidores: lastIg?.seguidores || 0,
    novosSeguidores: igDaily.reduce((s, d) => s + d.novosSeguidores, 0),
    reachTotal: igDaily.reduce((s, d) => s + d.reach, 0),
    impressionsTotal: igDaily.reduce((s, d) => s + d.impressions, 0),
    profileViews: igDaily.reduce((s, d) => s + d.profileViews, 0),
    postsPublicados: igDaily.reduce((s, d) => s + d.postsPublicados, 0),
    crescimentoSeguidores: firstIg && lastIg
      ? lastIg.seguidores - firstIg.seguidores
      : 0,
  };

  // KPIs YouTube
  const lastYt = ytDaily[ytDaily.length - 1];
  const firstYt = ytDaily[0];
  const ytKpis = {
    inscritos: lastYt?.inscritos || 0,
    novosInscritos: ytDaily.reduce((s, d) => s + d.novosInscritos, 0),
    viewsTotal: ytDaily.reduce((s, d) => s + d.views, 0),
    videosPublicados: ytDaily.reduce((s, d) => s + d.videosPublicados, 0),
    crescimentoInscritos: firstYt && lastYt
      ? lastYt.inscritos - firstYt.inscritos
      : 0,
  };

  // Trend: social reach + leads (correlacao)
  const socialTrend = igDaily.map((ig) => {
    const traffic = trafficRecords.find((t) => t.data === ig.data);
    const yt = ytDaily.find((y) => y.data === ig.data);
    return {
      date: ig.data,
      igReach: ig.reach,
      igSeguidores: ig.seguidores,
      ytViews: yt?.views || 0,
      ytInscritos: yt?.inscritos || 0,
      leads: traffic?.totalLeads || 0,
    };
  });

  // Top posts Instagram
  const topPosts = igPosts.map((p) => ({
    id: p.igPostId,
    tipo: p.tipo,
    caption: p.caption ? p.caption.substring(0, 100) : null,
    publishedAt: p.publishedAt,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    saves: p.saves,
    reach: p.reach,
    engagement: p.engagement,
  }));

  // Top videos YouTube
  const topVideos = ytVideos.map((v) => ({
    id: v.ytVideoId,
    titulo: v.titulo,
    publishedAt: v.publishedAt,
    views: v.views,
    likes: v.likes,
    comments: v.comments,
  }));

  return NextResponse.json({
    instagram: igKpis,
    youtube: ytKpis,
    socialTrend,
    topPosts,
    topVideos,
  });
}
