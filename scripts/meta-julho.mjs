const TOKEN = process.env.META_ACCESS_TOKEN;
const ACT = process.env.LIV_META_AD_ACCOUNT_ID; // pode ou não ter prefixo act_
const acct = ACT.startsWith('act_') ? ACT : `act_${ACT}`;
const base = 'https://graph.facebook.com/v21.0';

const params = new URLSearchParams({
  access_token: TOKEN,
  level: 'account',
  time_range: JSON.stringify({ since: '2026-07-01', until: '2026-07-17' }),
  fields: 'spend,impressions,reach,clicks,ctr,cpc,cpm,actions,cost_per_action_type',
});
const r = await fetch(`${base}/${acct}/insights?${params}`);
const j = await r.json();
if (j.error) { console.log('ERRO:', JSON.stringify(j.error)); process.exit(1); }
const d = j.data?.[0];
if (!d) { console.log('Sem dados no período'); process.exit(0); }

const actMap = {};
for (const a of (d.actions||[])) actMap[a.action_type] = Number(a.value);
console.log('===== META ADS ACCOUNT (01-17/07) =====');
console.log(`Conta: ${acct}`);
console.log(`Spend: R$ ${Number(d.spend).toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
console.log(`Impressões: ${d.impressions} | Alcance: ${d.reach} | Clicks: ${d.clicks} | CTR: ${d.ctr}% | CPC: R$ ${d.cpc} | CPM: R$ ${d.cpm}`);
console.log('--- actions relevantes ---');
for (const k of Object.keys(actMap)) {
  if (/lead|messag|conversation|link_click/i.test(k)) console.log(`  ${k}: ${actMap[k]}`);
}
const leads = actMap['leadgen_grouped'] ?? actMap['onsite_conversion.lead_grouped'] ?? actMap['lead'] ?? actMap['leadgen.other'] ?? 0;
const msgs = actMap['onsite_conversion.messaging_conversation_started_7d'] ?? actMap['onsite_conversion.total_messaging_connection'] ?? 0;
console.log(`\nLEADS (form): ${leads} | CPL: R$ ${leads ? (Number(d.spend)/leads).toFixed(2) : '—'}`);
console.log(`Conversas WhatsApp: ${msgs} | Custo/conversa: R$ ${msgs ? (Number(d.spend)/msgs).toFixed(2) : '—'}`);

// Breakdown por campanha
const cp = new URLSearchParams({
  access_token: TOKEN, level: 'campaign',
  time_range: JSON.stringify({ since: '2026-07-01', until: '2026-07-17' }),
  fields: 'campaign_name,spend,impressions,clicks,actions', limit: '100',
});
const rc = await fetch(`${base}/${acct}/insights?${cp}`);
const jc = await rc.json();
console.log('\n--- por campanha ---');
for (const c of (jc.data||[])) {
  const am = {}; for (const a of (c.actions||[])) am[a.action_type]=Number(a.value);
  const l = am['leadgen_grouped'] ?? am['onsite_conversion.lead_grouped'] ?? am['lead'] ?? 0;
  const m = am['onsite_conversion.messaging_conversation_started_7d'] ?? 0;
  console.log(`${c.campaign_name}: R$ ${Number(c.spend).toLocaleString('pt-BR',{minimumFractionDigits:2}).padStart(9)} | ${l} leads | ${m} msgs`);
}
