// Geocoding de endereco de instalacao via Nominatim (OpenStreetMap, gratis).
// Usado ao salvar o endereco da geradora no setor tecnico, pra plotar o pin exato
// no Mapa de Usinas. Best-effort: se falhar, retorna null e o mapa cai no centroide da cidade.

export type Geocode = { lat: number; lon: number; cidade: string | null };

export async function geocodeEndereco(
  endereco: string,
  cidade?: string | null,
): Promise<Geocode | null> {
  const q = [endereco, cidade, "Rio Grande do Norte", "Brasil"]
    .filter(Boolean)
    .join(", ");
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=br&q=" +
    encodeURIComponent(q);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "comissoes-app/1.0 (LIV mapa de usinas)" },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const arr = (await r.json()) as Array<{
      lat: string;
      lon: string;
      address?: Record<string, string>;
    }>;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const it = arr[0];
    const lat = parseFloat(it.lat);
    const lon = parseFloat(it.lon);
    if (!isFinite(lat) || !isFinite(lon)) return null;
    const a = it.address || {};
    const cidadeGeo =
      a.city || a.town || a.village || a.municipality || a.county || cidade || null;
    return { lat, lon, cidade: cidadeGeo };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
