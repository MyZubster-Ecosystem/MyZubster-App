import api from './api';

/**
 * Confidence threshold for auto-submission (configurable).
 * Reports with confidence >= this value are considered high-enough
 * to auto-generate a report.
 */
export const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Send a captured waste image to the YOLOv8s backend for AI detection.
 * @param {string} imageUri - Local URI of the captured image.
 * @returns {Promise<{ wasteType: string, confidence: number, detections: Array }>}
 */
export async function detectWaste(imageUri) {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'waste.jpg',
  });
  const { data } = await api.post('/waste-detection/detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return data;
}

/**
 * Submit a waste report (AI-detected or manual).
 * @param {Object} payload
 * @param {string} payload.imageUri - Local URI of the captured image.
 * @param {number} payload.latitude
 * @param {number} payload.longitude
 * @param {string} payload.wasteType - One of: plastic, glass, metal, organic, bulky.
 * @param {number} payload.confidence - AI confidence (0-1).
 * @param {string} [payload.notes] - Optional user note.
 * @returns {Promise<Object>} The created report.
 */
export async function submitWasteReport({ imageUri, latitude, longitude, wasteType, confidence, notes }) {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'waste.jpg',
  });
  formData.append('latitude', String(latitude));
  formData.append('longitude', String(longitude));
  formData.append('wasteType', wasteType);
  formData.append('confidence', String(confidence));
  if (notes) formData.append('notes', notes);

  const { data } = await api.post('/waste-reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

/**
 * List AI-generated waste reports for the verification dashboard.
 * @param {Object} params - Query params (status, page, limit, …).
 * @returns {Promise<Array>} Array of report objects.
 */
export async function listAIReports(params = {}) {
  const { data } = await api.get('/waste-reports', { params });
  return Array.isArray(data) ? data : data.reports || [];
}

/**
 * Verify or reject an AI-generated report.
 * @param {string} reportId
 * @param {'verified'|'rejected'} action
 * @returns {Promise<Object>} Updated report.
 */
export async function verifyReport(reportId, action) {
  const { data } = await api.patch(`/waste-reports/${encodeURIComponent(reportId)}/verify`, { action });
  return data;
}