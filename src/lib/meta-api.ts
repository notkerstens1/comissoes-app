// Meta Ads API client — adaptado de ruflo/meta-ads-report/meta-api.js
// Busca insights da conta LIV no Meta Graph API

const BASE_URL = "https://graph.facebook.com";
const API_VERSION = "v25.0";

interface MetaInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  messages: number;
  leads: number;
  totalResults: number;
  costPerResult: number;
}

interface CampaignInsights extends MetaInsights {
  campaignId: string;
  campaignName: string;
  adsetId?: string;
  adsetName?: string;
}

interface RawInsight {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
}

function findActionValue(actions: Array<{ action_type: string; value: string }>, actionType: string): number {
  const action = actions.find((a) => a.action_type === actionType);
  return action ? parseInt(action.value, 10) : 0;
}

function parseInsights(raw: RawInsight): MetaInsights {
  const actions = raw.actions || [];
  const messages = findActionValue(actions, "onsite_conversion.messaging_conversation_started_7d");
  const leads = findActionValue(actions, "lead");
  const totalResults = messages + leads;
  const spend = parseFloat(raw.spend || "0");
  const costPerResult = totalResults > 0 ? spend / totalResults : 0;

  return {
    spend,
    impressions: parseInt(raw.impressions || "0", 10),
    reach: parseInt(raw.reach || "0", 10),
    clicks: parseInt(raw.clicks || "0", 10),
    ctr: parseFloat(raw.ctr || "0"),
    cpc: parseFloat(raw.cpc || "0"),
    cpm: parseFloat(raw.cpm || "0"),
    messages,
    leads,
    totalResults,
    costPerResult,
  };
}

// Buscar insights account-level (totais do dia)
export async function fetchAccountInsights(
  accountId: string,
  accessToken: string,
  datePreset: string = "yesterday"
): Promise<MetaInsights | null> {
  const fields = ["spend", "impressions", "reach", "clicks", "ctr", "cpc", "cpm", "actions", "cost_per_action_type"].join(",");

  const url = `${BASE_URL}/${API_VERSION}/${accountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Meta API erro: ${res.status} - ${JSON.stringify(error.error?.message || error)}`);
  }

  const json = await res.json();
  if (!json.data || json.data.length === 0) return null;

  return parseInsights(json.data[0]);
}

// Buscar insights por campanha (breakdown)
export async function fetchCampaignInsights(
  accountId: string,
  accessToken: string,
  datePreset: string = "yesterday"
): Promise<CampaignInsights[]> {
  const fields = [
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "reach",
    "clicks",
    "ctr",
    "cpc",
    "cpm",
    "actions",
    "cost_per_action_type",
  ].join(",");

  const url = `${BASE_URL}/${API_VERSION}/${accountId}/insights?fields=${fields}&date_preset=${datePreset}&level=campaign&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Meta API campaign erro: ${res.status} - ${JSON.stringify(error.error?.message || error)}`);
  }

  const json = await res.json();
  if (!json.data || json.data.length === 0) return [];

  return json.data.map((raw: RawInsight) => ({
    ...parseInsights(raw),
    campaignId: raw.campaign_id || "",
    campaignName: raw.campaign_name || "",
  }));
}

// Buscar insights por adset (breakdown mais granular)
export async function fetchAdsetInsights(
  accountId: string,
  accessToken: string,
  datePreset: string = "yesterday"
): Promise<CampaignInsights[]> {
  const fields = [
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "spend",
    "impressions",
    "reach",
    "clicks",
    "ctr",
    "cpc",
    "cpm",
    "actions",
    "cost_per_action_type",
  ].join(",");

  const url = `${BASE_URL}/${API_VERSION}/${accountId}/insights?fields=${fields}&date_preset=${datePreset}&level=adset&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Meta API adset erro: ${res.status} - ${JSON.stringify(error.error?.message || error)}`);
  }

  const json = await res.json();
  if (!json.data || json.data.length === 0) return [];

  return json.data.map((raw: RawInsight) => ({
    ...parseInsights(raw),
    campaignId: raw.campaign_id || "",
    campaignName: raw.campaign_name || "",
    adsetId: raw.adset_id,
    adsetName: raw.adset_name,
  }));
}

// Buscar insights por range de datas (para backfill)
export async function fetchInsightsByDateRange(
  accountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<Array<CampaignInsights & { date: string }>> {
  const fields = [
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "reach",
    "clicks",
    "ctr",
    "cpc",
    "cpm",
    "actions",
    "cost_per_action_type",
  ].join(",");

  const url =
    `${BASE_URL}/${API_VERSION}/${accountId}/insights?fields=${fields}` +
    `&time_range={"since":"${startDate}","until":"${endDate}"}` +
    `&time_increment=1&level=campaign&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Meta API range erro: ${res.status} - ${JSON.stringify(error.error?.message || error)}`);
  }

  const json = await res.json();
  if (!json.data || json.data.length === 0) return [];

  return json.data.map((raw: RawInsight & { date_start?: string }) => ({
    ...parseInsights(raw),
    campaignId: raw.campaign_id || "",
    campaignName: raw.campaign_name || "",
    date: raw.date_start || startDate,
  }));
}
