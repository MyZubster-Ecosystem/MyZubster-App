import api from './api';

export async function listSegnalazioni({ status } = {}) {
  const { data } = await api.get('/segnalazioni', { params: { status } });
  return Array.isArray(data) ? data : data.segnalazioni || [];
}

export async function getSegnalazione(id) {
  const { data } = await api.get(`/segnalazioni/${encodeURIComponent(id)}`);
  return data;
}

export async function updateSegnalazioneStatus(id, status) {
  const { data } = await api.put(`/segnalazioni/${encodeURIComponent(id)}/status`, { status });
  return data;
}

export async function listInterventi({ segnalazioneId } = {}) {
  const { data } = await api.get('/interventi', { params: { segnalazioneId } });
  return Array.isArray(data) ? data : data.interventi || [];
}

export async function getMunicipalStats() {
  const { data } = await api.get('/municipal/stats');
  return data;
}

export async function listFleet() {
  const { data } = await api.get('/municipal/fleet');
  return Array.isArray(data) ? data : data.fleet || [];
}

export function exportCsv(segnalazioni, filename = 'segnalazioni.csv') {
  const headers = ['id', 'categoria', 'descrizione', 'stato', 'lat', 'lng', 'createdAt'];
  const rows = segnalazioni.map(s => [
    s.id || s._id || '',
    s.category || s.categoria || '',
    String(s.description || s.descrizione || '').replace(/,/g, ';'),
    s.status || s.stato || '',
    s.latitude ?? s.lat ?? '',
    s.longitude ?? s.lng ?? '',
    s.createdAt || '',
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return { csv, filename };
}

export function exportGeojson(segnalazioni) {
  const features = segnalazioni.map(s => {
    const lat = Number(s.latitude ?? s.lat);
    const lng = Number(s.longitude ?? s.lng);
    return {
      type: 'Feature',
      geometry: Number.isFinite(lat) && Number.isFinite(lng) ? { type: 'Point', coordinates: [lng, lat] } : null,
      properties: {
        id: s.id || s._id,
        category: s.category || s.categoria,
        description: s.description || s.descrizione,
        status: s.status || s.stato,
        createdAt: s.createdAt,
      },
    };
  });
  return { type: 'FeatureCollection', features };
}
