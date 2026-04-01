// YouTube Data API v3 + Analytics client
// Metricas de canal e videos

const DATA_API_URL = "https://www.googleapis.com/youtube/v3";
const ANALYTICS_URL = "https://youtubeanalytics.googleapis.com/v2";

interface ChannelStats {
  inscritos: number;
  views: number;
  videoCount: number;
}

interface VideoData {
  ytVideoId: string;
  titulo: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
}

// Buscar estatisticas do canal
export async function fetchChannelStats(
  channelId: string,
  apiKey: string
): Promise<ChannelStats | null> {
  const url = `${DATA_API_URL}/channels?part=statistics&id=${channelId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube channel erro: ${res.status}`);

  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) return null;

  return {
    inscritos: parseInt(channel.statistics.subscriberCount || "0", 10),
    views: parseInt(channel.statistics.viewCount || "0", 10),
    videoCount: parseInt(channel.statistics.videoCount || "0", 10),
  };
}

// Buscar videos recentes do canal com metricas
export async function fetchRecentVideos(
  channelId: string,
  apiKey: string,
  maxResults: number = 20
): Promise<VideoData[]> {
  // Buscar IDs dos videos recentes
  const searchUrl =
    `${DATA_API_URL}/search?part=id,snippet&channelId=${channelId}` +
    `&order=date&type=video&maxResults=${maxResults}&key=${apiKey}`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`YouTube search erro: ${searchRes.status}`);

  const searchData = await searchRes.json();
  const videoIds = (searchData.items || [])
    .map((item: any) => item.id?.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) return [];

  // Buscar estatisticas dos videos
  const statsUrl =
    `${DATA_API_URL}/videos?part=statistics,snippet,contentDetails` +
    `&id=${videoIds.join(",")}&key=${apiKey}`;

  const statsRes = await fetch(statsUrl);
  if (!statsRes.ok) throw new Error(`YouTube videos erro: ${statsRes.status}`);

  const statsData = await statsRes.json();

  return (statsData.items || []).map((video: any) => ({
    ytVideoId: video.id,
    titulo: video.snippet?.title || "",
    publishedAt: video.snippet?.publishedAt || new Date().toISOString(),
    views: parseInt(video.statistics?.viewCount || "0", 10),
    likes: parseInt(video.statistics?.likeCount || "0", 10),
    comments: parseInt(video.statistics?.commentCount || "0", 10),
  }));
}
