import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { confirmResolution, getFleet, getFleetStats, isDroneFleetEndpointError, sendMission } from '../services/droneFleetService';

const PRIORITIES = [
  { value: 'alta', labelKey: 'droneFleet.priorityHigh' },
  { value: 'media', labelKey: 'droneFleet.priorityMedium' },
  { value: 'bassa', labelKey: 'droneFleet.priorityLow' },
];

const droneKey = drone => String(drone.id || drone._id || drone.name || drone.serial || '');

export default function DroneFleetScreen({ navigation }) {
  const { t } = useLanguage();
  const [drones, setDrones] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDroneId, setSelectedDroneId] = useState('');
  const [priority, setPriority] = useState('media');
  const [missionType, setMissionType] = useState('');
  const [coords, setCoords] = useState('');
  const [missionId, setMissionId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [fleet, fleetStats] = await Promise.all([getFleet(), getFleetStats()]);
      setDrones(fleet);
      setStats(fleetStats);
    } catch (error) {
      if (isDroneFleetEndpointError(error)) {
        Alert.alert(t('droneFleet.title'), t('droneFleet.alert.endpointMissing'));
      } else {
        Alert.alert(t('droneFleet.title'), error.response?.data?.error || error.message || t('droneFleet.alert.loadFailed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const submitMission = async () => {
    if (!selectedDroneId) {
      Alert.alert(t('droneFleet.title'), t('droneFleet.alert.selectDrone'));
      return;
    }
    setBusy(true);
    try {
      let coordinates;
      if (coords.trim()) {
        const [lat, lng] = coords.split(',').map(Number);
        if (Number.isFinite(lat) && Number.isFinite(lng)) coordinates = { lat, lng };
      }
      await sendMission({
        droneId: selectedDroneId,
        priority,
        missionType: missionType.trim() || undefined,
        coordinates,
      });
      Alert.alert(t('droneFleet.title'), t('droneFleet.alert.missionSent'));
      setMissionType('');
      setCoords('');
      load(true);
    } catch (error) {
      Alert.alert(t('droneFleet.title'), error.response?.data?.error || error.message || t('droneFleet.alert.missionFailed'));
    } finally {
      setBusy(false);
    }
  };

  const submitConfirm = async () => {
    if (!missionId.trim()) {
      Alert.alert(t('droneFleet.title'), t('droneFleet.alert.missionIdRequired'));
      return;
    }
    setBusy(true);
    try {
      await confirmResolution({ missionId: missionId.trim(), droneId: selectedDroneId || undefined });
      Alert.alert(t('droneFleet.title'), t('droneFleet.alert.confirmSuccess'));
      setMissionId('');
      load(true);
    } catch (error) {
      Alert.alert(t('droneFleet.title'), error.response?.data?.error || error.message || t('droneFleet.alert.confirmFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>{t('common.loading')}</Text></View>;
  }

  const total = stats?.totalDrones ?? stats?.drones?.length ?? drones.length;
  const active = stats?.activeMissions ?? drones.filter(d => d.currentMission || d.missionId || d.status === 'mission').length;
  const pendingCount = stats?.pending ?? drones.filter(d => d.status === 'pending').length;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{t('droneFleet.back')}</Text></TouchableOpacity>
        <Text style={styles.title}>{t('droneFleet.title')}</Text>
        <TouchableOpacity onPress={() => load(true)}><Text style={styles.link}>{t('droneFleet.refresh')}</Text></TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{total}</Text><Text style={styles.statLabel}>{t('droneFleet.totalDrones')}</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{active}</Text><Text style={styles.statLabel}>{t('droneFleet.activeMissions')}</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{pendingCount}</Text><Text style={styles.statLabel}>{t('droneFleet.pending')}</Text></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('droneFleet.sendMission')}</Text>
        <Text style={styles.fieldLabel}>{t('droneFleet.selectDrone')}</Text>
        {drones.length === 0 ? <Text style={styles.muted}>{t('droneFleet.noDrones')}</Text> : <View style={styles.chips}>
          {drones.map(drone => {
            const key = droneKey(drone);
            const selected = key === selectedDroneId;
            return <TouchableOpacity key={key} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setSelectedDroneId(selected ? '' : key)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{drone.name || drone.id || key}</Text>
            </TouchableOpacity>;
          })}
        </View>}
        <Text style={styles.fieldLabel}>{t('droneFleet.priority')}</Text>
        <View style={styles.chips}>
          {PRIORITIES.map(({ value, labelKey }) => {
            const selected = priority === value;
            return <TouchableOpacity key={value} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setPriority(value)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t(labelKey)}</Text>
            </TouchableOpacity>;
          })}
        </View>
        <Text style={styles.fieldLabel}>{t('droneFleet.missionType')}</Text>
        <TextInput value={missionType} onChangeText={setMissionType} placeholder={t('droneFleet.missionTypePlaceholder')} style={styles.input} />
        <Text style={styles.fieldLabel}>{t('droneFleet.coordinates')}</Text>
        <TextInput value={coords} onChangeText={setCoords} placeholder={t('droneFleet.coordinatesPlaceholder')} autoCapitalize="none" style={styles.input} />
        <TouchableOpacity style={styles.primaryButton} onPress={submitMission} disabled={busy}>{busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('droneFleet.sendMission')}</Text>}</TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('droneFleet.confirmResolution')}</Text>
        <Text style={styles.fieldLabel}>{t('droneFleet.missionId')}</Text>
        <TextInput value={missionId} onChangeText={setMissionId} placeholder={t('droneFleet.missionIdPlaceholder')} autoCapitalize="none" style={styles.input} />
        <TouchableOpacity style={styles.secondaryButton} onPress={submitConfirm} disabled={busy}>{busy ? <ActivityIndicator color="#4CAF50" /> : <Text style={styles.secondaryText}>{t('droneFleet.confirmResolution')}</Text>}</TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('droneFleet.fleetList')}</Text>
        {drones.length === 0 ? <Text style={styles.muted}>{t('droneFleet.noDrones')}</Text> : drones.map(drone => (
          <View key={droneKey(drone)} style={styles.droneRow}>
            <View style={styles.droneInfo}>
              <Text style={styles.droneName}>{drone.name || drone.id || droneKey(drone)}</Text>
              <Text style={styles.muted}>{t('droneFleet.status')}: {drone.status || '—'} · {t('droneFleet.location')}: {drone.location || drone.position || '—'}</Text>
            </View>
            <View style={styles.droneRight}>
              <Text style={styles.battery}>{t('droneFleet.battery')}: {drone.battery != null ? `${drone.battery}%` : '—'}</Text>
              <Text style={styles.muted}>{drone.missionId ? `${t('droneFleet.missionId')}: ${drone.missionId}` : ''}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  back: { color: '#1976D2', fontSize: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  link: { color: '#1976D2', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#17351f' },
  statLabel: { color: '#777', fontSize: 12, textAlign: 'center', marginTop: 4 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  fieldLabel: { fontSize: 13, color: '#555', marginBottom: 6, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: '#4CAF50', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipSelected: { backgroundColor: '#4CAF50' },
  chipText: { color: '#277d35', fontWeight: '600' },
  chipTextSelected: { color: 'white' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10 },
  primaryButton: { backgroundColor: '#4CAF50', padding: 13, borderRadius: 8, alignItems: 'center' },
  secondaryButton: { borderWidth: 1, borderColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '700' },
  secondaryText: { color: '#277d35', fontWeight: '700' },
  droneRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  droneInfo: { flex: 1, paddingRight: 8 },
  droneName: { fontWeight: '700', marginBottom: 3 },
  battery: { fontWeight: '600', textAlign: 'right' },
  droneRight: { alignItems: 'flex-end' },
  muted: { color: '#777' },
});
