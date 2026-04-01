import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { fetchChannelStats, fetchRecentVideos } from "@/lib/youtube-api";

// POST /api/sync/youtube — Sincronizar metricas do YouTube
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY ou YOUTUBE_CHANNEL_ID nao configurados" },
      { status: 500 }
    );
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Estatisticas do canal
    const channelStats = await fetchChannelStats(channelId, apiKey);

    if (channelStats) {
      // Buscar dia anterior para calcular novos inscritos
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const prevDay = await prisma.youTubeDaily.findUnique({
        where: { data: yesterdayStr },
        select: { inscritos: true, views: true },
      });

      const novosInscritos = prevDay
        ? channelStats.inscritos - prevDay.inscritos
        : 0;

      await prisma.youTubeDaily.upsert({
        where: { data: today },
        update: {
          inscritos: channelStats.inscritos,
          novosInscritos: Math.max(0, novosInscritos),
          views: channelStats.views,
          synced_at: new Date(),
        },
        create: {
          data: today,
          inscritos: channelStats.inscritos,
          novosInscritos: Math.max(0, novosInscritos),
          views: channelStats.views,
        },
      });
    }

    // 2. Videos recentes
    const videos = await fetchRecentVideos(channelId, apiKey);
    let videossynced = 0;

    for (const video of videos) {
      await prisma.youTubeVideo.upsert({
        where: { ytVideoId: video.ytVideoId },
        update: {
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          synced_at: new Date(),
        },
        create: {
          ytVideoId: video.ytVideoId,
          titulo: video.titulo,
          publishedAt: new Date(video.publishedAt),
          views: video.views,
          likes: video.likes,
          comments: video.comments,
        },
      });
      videossynced++;
    }

    // Contar videos publicados hoje
    const todayVideos = videos.filter((v) => v.publishedAt.startsWith(today));
    if (todayVideos.length > 0) {
      await prisma.youTubeDaily.update({
        where: { data: today },
        data: { videosPublicados: todayVideos.length },
      });
    }

    return NextResponse.json({
      success: true,
      channel: channelStats,
      videossynced,
      message: `YouTube sync: canal atualizado + ${videossynced} videos sincronizados`,
    });
  } catch (error: any) {
    console.error("Erro no sync YouTube:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}

// GET /api/sync/youtube — Status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const lastDaily = await prisma.youTubeDaily.findFirst({
    orderBy: { data: "desc" },
    select: { data: true, inscritos: true, views: true, synced_at: true },
  });

  const totalVideos = await prisma.youTubeVideo.count();

  return NextResponse.json({
    lastSync: lastDaily?.synced_at || null,
    lastDate: lastDaily?.data || null,
    inscritos: lastDaily?.inscritos || 0,
    totalVideos,
    configured: !!(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CHANNEL_ID),
  });
}
