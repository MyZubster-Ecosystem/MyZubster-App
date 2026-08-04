import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import i18n from '../i18n/i18n';
import { getDroneKitStatus, runDroneMissionSimulation } from '../services/droneWasteService';

const BASE = { lat: 45.4642, lng: 9.19 };

// A short, scripted sensor demo that exercises the full mission lifecycle
// (detect -> approach -> collect up to 1kg -> return -> recharge).
const DEMO_SCRIPT = [
  { battery: 0.95, detection: null },
  { battery: 0.92, detection: null },
  { battery: 0.9, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 } },
  { battery: 0.88, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 } },
  { battery: 0.86, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 } },
  { battery: 0.84, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 }, scaleKg: 0 },
  { battery: 0.82, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 }, scaleKg: 0.5 },
  { battery: 0.8, detection: { label: 'plastic', confidence: 0.9, distanceM: 0.3 }, scaleKg: 0.6 },
  { battery: 0.78, detection: null },
  { battery: 0.76, gps: BASE },
  { battery: 0.74, detection: null },
];

export default function DroneKitScreen() {
  const status = getDroneKitStatus();
  const info = status.info;
  const inference = status.inference;
  const [demo, setDemo] = useState(null);

  const runDemo = () => {
    const out = runDroneMissionSimulation({
      base: BASE,
      geofence: { center: BASE, radiusKm: info.geofenceRadiusKm },
      targets: [{ lat: 45.465, lng: 9.195 }],
      script: DEMO_SCRIPT,
    });
    setDemo(out);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>{i18n.t('drone.title')}</Text>
      <Text style={styles.sub}>{i18n.t('drone.subtitle')}</Text>

      <View style={styles.card}>
        <InfoRow label={i18n.t('drone.maxPayload')} value={`${info.maxPayloadKg} kg`} />
        <InfoRow label={i18n.t('drone.flightBudget')} value={`${info.flightBudgetMin} min`} />
        <InfoRow label={i18n.t('drone.geofence')} value={`${info.geofenceRadiusKm} km`} />
        <InfoRow label={i18n.t('drone.visionModel')} value={info.visionModel} />
        <InfoRow label={i18n.t('drone.board')} value={inference.target.board} />
        <InfoRow label={i18n.t('drone.lifecycle')} value={inference.states.join(' -> ')} />
      </View>

      <TouchableOpacity style={styles.button} onPress={runDemo}>
        <Text style={styles.buttonText}>{i18n.t('drone.runDemo')}</Text>
      </TouchableOpacity>

      {demo && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{i18n.t('drone.demoResult')}</Text>
          <InfoRow label={i18n.t('drone.completed')} value={demo.summary.completed ? 'yes' : 'no'} />
          <InfoRow label={i18n.t('drone.finalState')} value={demo.summary.finalState} />
          <InfoRow label={i18n.t('drone.collected')} value={`${demo.summary.collectedKg.toFixed(2)} kg`} />
          <InfoRow label={i18n.t('drone.distance')} value={`${demo.summary.distanceKm.toFixed(2)} km`} />
          <InfoRow label={i18n.t('drone.collectEvents')} value={String(demo.summary.collectEvents)} />
        </View>
      )}

      <Text style={styles.note}>{i18n.t('drone.note')}</Text>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101820' },
  content: { padding: 16 },
  h1: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sub: { color: '#9AA7B4', fontSize: 14, marginBottom: 16 },
  card: { backgroundColor: '#1B2733', borderRadius: 8, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: '#9AA7B4', fontSize: 14 },
  rowValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  button: { backgroundColor: '#FF6B35', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  note: { color: '#6B7785', fontSize: 12, marginTop: 4, lineHeight: 18 },
});
