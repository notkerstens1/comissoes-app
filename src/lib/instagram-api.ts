// Instagram Graph API client
// Usa Instagram Graph API para metricas de conta e posts

const BASE_URL = "https://graph.facebook.com/v21.0";

interface IGAccountInsights {
  seguidores: number;
  reach: number;
  impressions: number;
  profileViews: number;
  websiteClicks: number;
}

interface IGPostData {
  igPostId: string;
  tipo: string;
  caption: string | null;
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement: number;
}

// Buscar metricas da conta (periodo: day, week, days_28)
export async function fetchAccountInsights(
  businessId: string,
  accessToken: string,
  period: string = "day"
): Promise<IGAccountInsights | null> {
  // Seguidores
  const profileUrl = `${BASE_URL}/${businessId}?fields=followers_count&access_token=${accessToken}`;
  const profileRes = await fetch(profileUrl);
  if (!profileRes.ok) throw new Error(`Instagram profile erro: ${profileRes.status}`);
  const profileData = await profileRes.json();

  // Insights da conta
  const metrics = "reach,impressions,profile_views,website_clicks";
  const insightsUrl = `${BASE_URL}/${businessId}/insights?metric=${metrics}&period=${period}&access_token=${accessToken}`;
  const insightsRes = await fetch(insightsUrl);

  let reach = 0, impressions = 0, profileViews = 0, websiteClicks = 0;

  if (insightsRes.ok) {
    const insightsData = await insightsRes.json();
    for (const metric of insightsData.data || []) {
      const value = metric.values?.[0]?.value || 0;
      switch (metric.name) {
        case "reach": reach = value; break;
        case "impressions": impressions = value; break;
        case "profile_views": profileViews = value; break;
        case "website_clicks": websiteClicks = value; break;
      }
    }
  }

  return {
    seguidores: profileData.followers_count || 0,
    reach,
    impressions,
    profileViews,
    websiteClicks,
  };
}

// Buscar posts recentes com metricas
export async function fetchRecentPosts(
  businessId: string,
  accessToken: string,
  limit: number = 25
): Promise<IGPostData[]> {
  const fields = "id,caption,timestamp,media_type,like_count,comments_count";
  const url = `${BASE_URL}/${businessId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Instagram media erro: ${res.status}`);

  const data = await res.json();
  const posts: IGPostData[] = [];

  for (const post of data.data || []) {
    // Buscar insights do post individual
    let reach = 0, impressions = 0, saves = 0, shares = 0;
    try {
      const insightsUrl = `${BASE_URL}/${post.id}/insights?metric=reach,impressions,saved,shares&access_token=${accessToken}`;
      const insRes = await fetch(insightsUrl);
      if (insRes.ok) {
        const insData = await insRes.json();
        for (const m of insData.data || []) {
          const v = m.values?.[0]?.value || 0;
          switch (m.name) {
            case "reach": reach = v; break;
            case "impressions": impressions = v; break;
            case "saved": saves = v; break;
            case "shares": shares = v; break;
          }
        }
      }
    } catch {
      // Insights podem nao estar disponiveis para todos os posts
    }

    const likes = post.like_count || 0;
    const comments = post.comments_count || 0;
    const totalEngagement = likes + comments + shares + saves;
    const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

    posts.push({
      igPostId: post.id,
      tipo: mapMediaType(post.media_type),
      caption: post.caption || null,
      publishedAt: post.timestamp,
      likes,
      comments,
      shares,
      saves,
      reach,
      impressions,
      engagement: Math.round(engagementRate * 100) / 100,
    });
  }

  return posts;
}

function mapMediaType(type: string): string {
  switch (type) {
    case "IMAGE": return "IMAGE";
    case "VIDEO": return "REEL"; // Instagram trata reels como VIDEO
    case "CAROUSEL_ALBUM": return "CAROUSEL";
    default: return type || "IMAGE";
  }
}
