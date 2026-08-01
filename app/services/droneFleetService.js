import api from './api';

const unwrap = data => data?.data ?? data;

// The drone/robot fleet endpoints are a gateway contract for Pixie Drone or
// similar fleet systems. They may be unimplemented on the deployed Gateway,
// so callers can detect missing endpoints with isDroneFleetEndpointError().
export async function getFleet() {
  const { data } = await api.get('/fleet');
  const result = unwrap(data);
  return Array.isArray(result) ? result : result?.drones || result?.fleet || [];
}

export async function getFleetStats() {
  const { data } = await api.get('/fleet/stats');
  return unwrap(data);
}

export async function sendMission({ droneId, coordinates, priority = 'media', missionType, notes }) {
  const { data } = await api.post('/fleet/missions', {
    droneId: String(droneId ?? ''),
    ...(coordinates ? { coordinates } : {}),
    priority: String(priority || 'media'),
    ...(missionType ? { missionType: String(missionType) } : {}),
    ...(notes ? { notes: String(notes) } : {}),
  });
  return unwrap(data);
}

export async function confirmResolution({ missionId, droneId }) {
  const { data } = await api.post('/fleet/confirm', {
    missionId: String(missionId ?? ''),
    ...(droneId ? { droneId: String(droneId) } : {}),
  });
  return unwrap(data);
}

export function isDroneFleetEndpointError(error) {
  return [404, 501].includes(error?.response?.status);
}
