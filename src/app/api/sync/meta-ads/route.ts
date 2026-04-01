import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { fetchAccountInsights, fetchCampaignInsights } from "@/lib/meta-api";

// POST /api/sync/meta-ads — Sincronizar dados do Meta Ads
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.LIV_META_AD_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    return NextResponse.json(
      { error: "META_ACCESS_TOKEN ou LIV_META_AD_ACCOUNT_ID nao configurados" },
      { status: 500 }
    );
  }

  try {
    // Determinar periodo: body pode ter { datePreset, startDate, endDate }
    const body = await request.json().catch(() => ({}));
    const datePreset = body.datePreset || "yesterday";

    // 1. Buscar totais account-level
    const accountData = await fetchAccountInsights(accountId, accessToken, datePreset);

    // 2. Buscar breakdown por campanha
    const campaignData = await fetchCampaignInsights(accountId, accessToken, datePreset);

    // Determinar a data (yesterday por padrao)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dataStr = yesterday.toISOString().split("T")[0]; // "YYYY-MM-DD"

    let trafficResult = null;
    let campaignsCreated = 0;

    // 3. Upsert no DailyTraffic (totais do dia)
    if (accountData) {
      trafficResult = await prisma.dailyTraffic.upsert({
        where: { data: dataStr },
        update: {
          pessoasAlcancadas: accountData.reach || accountData.impressions,
          totalLeads: accountData.totalResults,
          valorInvestidoVendas: accountData.spend,
          valorGasto: accountData.spend,
          syncSource: "meta_ads",
        },
        create: {
          data: dataStr,
          pessoasAlcancadas: accountData.reach || accountData.impressions,
          totalLeads: accountData.totalResults,
          valorInvestidoVendas: accountData.spend,
          valorGasto: accountData.spend,
          syncSource: "meta_ads",
        },
      });
    }

    // 4. Upsert campanhas
    for (const campaign of campaignData) {
      await prisma.metaAdsCampaign.upsert({
        where: {
          data_campaignId_adsetId: {
            data: dataStr,
            campaignId: campaign.campaignId,
            adsetId: "account_level",
          },
        },
        update: {
          campaignName: campaign.campaignName,
          spend: campaign.spend,
          impressions: campaign.impressions,
          reach: campaign.reach,
          clicks: campaign.clicks,
          ctr: campaign.ctr,
          cpc: campaign.cpc,
          cpm: campaign.cpm,
          leads: campaign.leads,
          messages: campaign.messages,
          costPerResult: campaign.costPerResult,
          synced_at: new Date(),
        },
        create: {
          data: dataStr,
          campaignId: campaign.campaignId,
          campaignName: campaign.campaignName,
          spend: campaign.spend,
          impressions: campaign.impressions,
          reach: campaign.reach,
          clicks: campaign.clicks,
          ctr: campaign.ctr,
          cpc: campaign.cpc,
          cpm: campaign.cpm,
          leads: campaign.leads,
          messages: campaign.messages,
          costPerResult: campaign.costPerResult,
        },
      });
      campaignsCreated++;
    }

    return NextResponse.json({
      success: true,
      data: dataStr,
      traffic: trafficResult ? {
        pessoasAlcancadas: trafficResult.pessoasAlcancadas,
        totalLeads: trafficResult.totalLeads,
        valorGasto: trafficResult.valorGasto,
      } : null,
      campaigns: campaignsCreated,
      message: `Sync concluido: ${campaignsCreated} campanhas sincronizadas para ${dataStr}`,
    });
  } catch (error: any) {
    console.error("Erro no sync Meta Ads:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno no sync" },
      { status: 500 }
    );
  }
}

// GET /api/sync/meta-ads — Status do ultimo sync
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const lastSync = await prisma.metaAdsCampaign.findFirst({
    orderBy: { synced_at: "desc" },
    select: { synced_at: true, data: true },
  });

  const lastTraffic = await prisma.dailyTraffic.findFirst({
    where: { syncSource: "meta_ads" },
    orderBy: { data: "desc" },
    select: { data: true, pessoasAlcancadas: true, totalLeads: true, valorGasto: true },
  });

  return NextResponse.json({
    lastSync: lastSync?.synced_at || null,
    lastDate: lastSync?.data || null,
    lastTraffic,
    configured: !!(process.env.META_ACCESS_TOKEN && process.env.LIV_META_AD_ACCOUNT_ID),
  });
}
