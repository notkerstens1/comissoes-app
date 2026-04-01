import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { fetchAccountInsights, fetchRecentPosts } from "@/lib/instagram-api";

// POST /api/sync/instagram — Sincronizar metricas do Instagram
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!accessToken || !businessId) {
    return NextResponse.json(
      { error: "INSTAGRAM_ACCESS_TOKEN ou INSTAGRAM_BUSINESS_ID nao configurados" },
      { status: 500 }
    );
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Buscar insights da conta
    const accountData = await fetchAccountInsights(businessId, accessToken);

    if (accountData) {
      // Buscar seguidores do dia anterior para calcular novos
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const prevDay = await prisma.instagramDaily.findUnique({
        where: { data: yesterdayStr },
        select: { seguidores: true },
      });

      const novosSeguidores = prevDay
        ? accountData.seguidores - prevDay.seguidores
        : 0;

      await prisma.instagramDaily.upsert({
        where: { data: today },
        update: {
          seguidores: accountData.seguidores,
          novosSeguidores: Math.max(0, novosSeguidores),
          reach: accountData.reach,
          impressions: accountData.impressions,
          profileViews: accountData.profileViews,
          websiteClicks: accountData.websiteClicks,
          synced_at: new Date(),
        },
        create: {
          data: today,
          seguidores: accountData.seguidores,
          novosSeguidores: Math.max(0, novosSeguidores),
          reach: accountData.reach,
          impressions: accountData.impressions,
          profileViews: accountData.profileViews,
          websiteClicks: accountData.websiteClicks,
        },
      });
    }

    // 2. Buscar posts recentes
    const posts = await fetchRecentPosts(businessId, accessToken);
    let postssynced = 0;

    for (const post of posts) {
      await prisma.instagramPost.upsert({
        where: { igPostId: post.igPostId },
        update: {
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          saves: post.saves,
          reach: post.reach,
          impressions: post.impressions,
          engagement: post.engagement,
          synced_at: new Date(),
        },
        create: {
          igPostId: post.igPostId,
          tipo: post.tipo,
          caption: post.caption,
          publishedAt: new Date(post.publishedAt),
          likes: post.likes,
          comments: post.comments,
          shares: post.shares,
          saves: post.saves,
          reach: post.reach,
          impressions: post.impressions,
          engagement: post.engagement,
        },
      });
      postssynced++;
    }

    // Contar posts publicados hoje para o daily
    const todayPosts = posts.filter((p) => p.publishedAt.startsWith(today));
    const reels = todayPosts.filter((p) => p.tipo === "REEL").length;
    const stories = todayPosts.filter((p) => p.tipo === "STORY").length;

    if (todayPosts.length > 0) {
      await prisma.instagramDaily.update({
        where: { data: today },
        data: {
          postsPublicados: todayPosts.length,
          reels,
          stories,
        },
      });
    }

    return NextResponse.json({
      success: true,
      account: accountData,
      postssynced,
      message: `Instagram sync: conta atualizada + ${postssynced} posts sincronizados`,
    });
  } catch (error: any) {
    console.error("Erro no sync Instagram:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}

// GET /api/sync/instagram — Status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const lastDaily = await prisma.instagramDaily.findFirst({
    orderBy: { data: "desc" },
    select: { data: true, seguidores: true, synced_at: true },
  });

  const totalPosts = await prisma.instagramPost.count();

  return NextResponse.json({
    lastSync: lastDaily?.synced_at || null,
    lastDate: lastDaily?.data || null,
    seguidores: lastDaily?.seguidores || 0,
    totalPosts,
    configured: !!(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ID),
  });
}
