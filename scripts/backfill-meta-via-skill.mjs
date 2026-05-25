// Backfill de Meta Ads usando a skill /meta-ads-ratos (Erick local).
// Usado pra preencher MetaAdsCampaign e DailyTraffic com dias historicos
// quando o sync nativo do app esta com token expirado.
//
// Pre-requisitos:
//   - Skill meta-ads-ratos configurada em ~/.claude/skills/meta-ads-ratos/
//   - Python 3 + dependencias da skill instaladas
//   - DATABASE_URL configurado (.env ou .env.production.local)
//
// Uso:
//   node scripts/backfill-meta-via-skill.mjs --from 2026-03-30 --to 2026-05-25
//   node scripts/backfill-meta-via-skill.mjs --from 2026-05-01 --account act_859606976869812
//
// Default: account = act_859606976869812 (LIV), to = hoje.

import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const SKILL_INSIGHTS = join(homedir(), ".claude/skills/meta-ads-ratos/scripts/insights.py");
const DEFAULT_ACCOUNT = "act_859606976869812";
const FIELDS_CAMPAIGN = "campaign_id,campaign_name,spend,impressions,reach,clicks,ctr,cpc,cpm,actions,cost_per_action_type";
const FIELDS_ACCOUNT = "spend,impressions,reach,clicks,ctr,cpc,cpm,actions,cost_per_action_type";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { from: null, to: null, account: DEFAULT_ACCOUNT };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from") out.from = args[++i];
    else if (args[i] === "--to") out.to = args[++i];
    else if (args[i] === "--account") out.account = args[++i];
  }
  if (!out.from) throw new Error("Faltou --from YYYY-MM-DD");
  if (!out.to) out.to = new Date().toISOString().split("T")[0];
  return out;
}

function* eachDay(from, to) {
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    yield d.toISOString().split("T")[0];
  }
}

function findActionValue(actions, type) {
  const a = (actions || []).find((x) => x.action_type === type);
  return a ? parseInt(a.value, 10) : 0;
}

function callSkill(level, account, date, extraFields) {
  const args = [
    SKILL_INSIGHTS,
    "account",
    "--id",
    account,
    "--time-range",
    JSON.stringify({ since: date, until: date }),
    "--level",
    level,
    "--fields",
    extraFields,
  ];
  const out = execFileSync("python3", args, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  // A skill imprime warnings + "Token carregado..." no stderr; stdout deve ter JSON puro
  const trimmed = out.trim();
  const jsonStart = trimmed.indexOf("[");
  const jsonEnd = trimmed.lastIndexOf("]");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`Output sem JSON valido pra ${date} (${level})`);
  }
  return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
}

function parseInsight(raw) {
  const actions = raw.actions || [];
  const leads = findActionValue(actions, "offsite_complete_registration_add_meta_leads")
    || findActionValue(actions, "lead");
  const messages = findActionValue(actions, "onsite_conversion.messaging_conversation_started_7d");
  const spend = parseFloat(raw.spend || "0");
  return {
    spend,
    impressions: parseInt(raw.impressions || "0", 10),
    reach: parseInt(raw.reach || "0", 10),
    clicks: parseInt(raw.clicks || "0", 10),
    ctr: parseFloat(raw.ctr || "0"),
    cpc: parseFloat(raw.cpc || "0"),
    cpm: parseFloat(raw.cpm || "0"),
    leads,
    messages,
    costPerResult: leads + messages > 0 ? spend / (leads + messages) : 0,
  };
}

async function main() {
  const opts = parseArgs();
  console.log(`Backfill Meta — account=${opts.account} from=${opts.from} to=${opts.to}`);

  const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

  let diasProcessados = 0;
  let campanhasUpsertadas = 0;
  let diasComDados = 0;
  let diasSemDados = 0;

  try {
    for (const date of eachDay(opts.from, opts.to)) {
      // 1. Account-level (totais do dia)
      const accountRaw = callSkill("account", opts.account, date, FIELDS_ACCOUNT);
      const accountData = accountRaw[0] ? parseInsight(accountRaw[0]) : null;

      // 2. Campaign-level (breakdown)
      const campaignRaw = callSkill("campaign", opts.account, date, FIELDS_CAMPAIGN);

      const temDados = accountData && accountData.spend > 0;
      if (temDados) {
        diasComDados++;
      } else {
        diasSemDados++;
      }

      // Upsert DailyTraffic (account-level do dia)
      if (accountData) {
        await prisma.dailyTraffic.upsert({
          where: { data: date },
          update: {
            pessoasAlcancadas: accountData.reach || accountData.impressions,
            totalLeads: accountData.leads + accountData.messages,
            valorInvestidoVendas: accountData.spend,
            valorGasto: accountData.spend,
            syncSource: "meta_ads",
          },
          create: {
            data: date,
            pessoasAlcancadas: accountData.reach || accountData.impressions,
            totalLeads: accountData.leads + accountData.messages,
            valorInvestidoVendas: accountData.spend,
            valorGasto: accountData.spend,
            syncSource: "meta_ads",
          },
        });
      }

      // Upsert MetaAdsCampaign (por campanha do dia)
      for (const raw of campaignRaw) {
        const parsed = parseInsight(raw);
        const campaignId = raw.campaign_id || "unknown";
        const campaignName = raw.campaign_name || "Sem nome";
        await prisma.metaAdsCampaign.upsert({
          where: {
            data_campaignId_adsetId: {
              data: date,
              campaignId,
              adsetId: "account_level",
            },
          },
          update: {
            campaignName,
            spend: parsed.spend,
            impressions: parsed.impressions,
            reach: parsed.reach,
            clicks: parsed.clicks,
            ctr: parsed.ctr,
            cpc: parsed.cpc,
            cpm: parsed.cpm,
            leads: parsed.leads,
            messages: parsed.messages,
            costPerResult: parsed.costPerResult,
            synced_at: new Date(),
          },
          create: {
            data: date,
            campaignId,
            campaignName,
            spend: parsed.spend,
            impressions: parsed.impressions,
            reach: parsed.reach,
            clicks: parsed.clicks,
            ctr: parsed.ctr,
            cpc: parsed.cpc,
            cpm: parsed.cpm,
            leads: parsed.leads,
            messages: parsed.messages,
            costPerResult: parsed.costPerResult,
          },
        });
        campanhasUpsertadas++;
      }

      diasProcessados++;
      const marker = temDados ? "✓" : "—";
      const lead = accountData ? `R$${accountData.spend.toFixed(2).padStart(8)} | ${(accountData.leads + accountData.messages).toString().padStart(3)} leads` : "sem dados";
      console.log(`  ${marker} ${date}  ${lead}  |  ${campaignRaw.length} campanha(s)`);
    }

    console.log(`\nResumo:`);
    console.log(`  ${diasProcessados} dias processados`);
    console.log(`  ${diasComDados} dias com veiculacao  |  ${diasSemDados} dias sem`);
    console.log(`  ${campanhasUpsertadas} registros de campanha upsertados em MetaAdsCampaign`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Erro no backfill:", e.message);
  process.exit(1);
});
