import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import {
  exportCsv,
  exportGeojson,
  getMunicipalStats,
  getSegnalazione,
  listFleet,
  listInterventi,
  listSegnalazioni,
  updateSegnalazioneStatus,
} from '../services/segnalazioniService';

const STATUS_OPTIONS = ['all', 'accepted', 'in_progress', 'resolved'];

export default function MunicipalDashboardScreen({ navigation }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [segnalazioni, setSegnalazioni] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [nextStats, nextReports, nextFleet] = await Promise.all([getMunicipalStats(), listSegnalazioni(), listFleet()]);
      setStats(nextStats);
      setSegnalazioni(nextReports);
      setFleet(nextFleet);
    } catch (error) {
      Alert.alert(t('municipal.title'), error.response?.data?.error || error.message || t('municipal.alert.loadDataFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => load(true);

  const openReport = async (item) => {
    setSelectedReport(item);
    setNewStatus(item.status || item.stato || '');
    try {
      const detail = await getSegnalazione(item.id || item._id);
      setReportDetail(detail);
      const next = await listInterventi({ segnalazioneId: item.id || item._id });
      setInterventions(next);
    } catch (error) {
      Alert.alert(t('municipal.title'), error.response?.data?.error || error.message || t('municipal.alert.loadDetailFailed'));
    }
  };

  const closeReport = () => {
    setSelectedReport(null);
    setReportDetail(null);
    setInterventions([]);
    setNewStatus('');
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport || !newStatus) return;
    setUpdating(true);
    try {
      await updateSegnalazioneStatus(selectedReport.id || selectedReport._id, newStatus);
      Alert.alert(t('common.success'), t('municipal.alert.updateSuccess'));
      await load(true);
      closeReport();
    } catch (error) {
      Alert.alert(t('common.error'), error.response?.data?.error || error.message || t('municipal.alert.updateFailed'));
    } finally {
      setUpdating(false);
    }
  };

  const handleExportCsv = () => {
    const { csv, filename } = exportCsv(segnalazioni);
    Share.share({ title: 'Segnalazioni CSV', message: csv });
  };

  const handleExportGeojson = () => {
    const geojson = exportGeojson(segnalazioni);
    Share.share({ title: 'Segnalazioni GeoJSON', message: JSON.stringify(geojson, null, 2) });
  };

  const filtered = statusFilter === 'all' ? segnalazioni : segnalazioni.filter(s => (s.status || s.stato) === statusFilter);

  const totalReports = stats?.totalReports ?? segnalazioni.length;
  const totalInterventions = stats?.totalInterventions ?? interventions.length;
  const avgResolution = stats?.avgResolutionTime ?? '—';

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>{t('common.loading')}</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{t('municipal.back')}</Text></TouchableOpacity>
        <Text style={styles.title}>{t('municipal.title')}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalReports}</Text>
          <Text style={styles.statLabel}>{t('municipal.stats.totalReports')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalInterventions}</Text>
          <Text style={styles.statLabel}>{t('municipal.stats.totalInterventions')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{String(avgResolution)}</Text>
          <Text style={styles.statLabel}>{t('municipal.stats.avgResolutionTime')}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportCsv}><Text style={styles.exportText}>{t('municipal.export.csv')}</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.exportButton, styles.geoButton]} onPress={handleExportGeojson}><Text style={styles.exportText}>{t('municipal.export.geojson')}</Text></TouchableOpacity>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>{t('municipal.reports')}</Text>
        <TouchableOpacity onPress={handleRefresh}><Text style={styles.refresh}>{t('municipal.refresh')}</Text></TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {STATUS_OPTIONS.map(option => (
          <TouchableOpacity key={option} style={[styles.filterChip, statusFilter === option && styles.filterChipActive]} onPress={() => setStatusFilter(option)}>
            <Text style={[styles.filterChipText, statusFilter === option && styles.filterChipTextActive]}>
              {option === 'all' ? t('municipal.filters.all') : option === 'accepted' ? t('municipal.filters.accepted') : option === 'in_progress' ? t('municipal.filters.inProgress') : t('municipal.filters.resolved')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? <View style={styles.empty}><Text style={styles.emptyText}>{t('municipal.empty.noReports')}</Text></View> : <FlatList
        data={filtered}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        keyExtractor={item => String(item.id || item._id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const status = item.status || item.stato || '';
          const statusLabel = status === 'accepted' ? t('municipal.status.accepted') : status === 'in_progress' ? t('municipal.status.inProgress') : status === 'resolved' ? t('municipal.status.resolved') : status;
          return <TouchableOpacity style={styles.card} onPress={() => openReport(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>#{item.id || item._id}</Text>
              <Text style={[styles.badge, status === 'resolved' ? styles.resolved : status === 'in_progress' ? styles.inProgress : styles.accepted]}>{String(statusLabel).toUpperCase()}</Text>
            </View>
            <Text style={styles.cardBody} numberOfLines={2}>{item.description || item.descrizione || '—'}</Text>
            <Text style={styles.cardMeta}>{t('municipal.category')}: {item.category || item.categoria || '—'}</Text>
            <Text style={styles.cardMeta}>{t('municipal.createdAt')}: {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</Text>
          </TouchableOpacity>;
        }}
      />}

      <View style={styles.fleetSection}>
        <Text style={styles.sectionTitle}>{t('municipal.fleet.title')}</Text>
        {fleet.length === 0 ? <Text style={styles.emptyText}>{t('municipal.empty.noFleet')}</Text> : <FlatList
          data={fleet}
          horizontal
          keyExtractor={item => String(item.id || item._id || item.droneId)}
          contentContainerStyle={styles.fleetList}
          renderItem={({ item }) => (
            <View style={styles.fleetCard}>
              <Text style={styles.fleetId}>{item.droneId || item.id || item._id}</Text>
              <Text style={styles.fleetStatus}>{t('municipal.fleet.status')}: {item.status || '—'}</Text>
              <Text style={styles.fleetLocation}>{t('municipal.fleet.location')}: {item.location || item.coordinates || '—'}</Text>
            </View>
          )}
        />}
      </View>

      <Modal visible={!!selectedReport} animationType="slide" onRequestClose={closeReport}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeReport}><Text style={styles.back}>{t('municipal.back')}</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{t('municipal.reportDetail')}</Text>
          </View>
          {reportDetail ? <View style={styles.modalBody}>
            <Text style={styles.detailText}><Text style={styles.detailLabel}>{t('municipal.category')}: </Text>{reportDetail.category || reportDetail.categoria || '—'}</Text>
            <Text style={styles.detailText}><Text style={styles.detailLabel}>{t('municipal.description')}: </Text>{reportDetail.description || reportDetail.descrizione || '—'}</Text>
            <Text style={styles.detailText}><Text style={styles.detailLabel}>{t('municipal.coordinates')}: </Text>{reportDetail.latitude ?? reportDetail.lat ?? '—'}, {reportDetail.longitude ?? reportDetail.lng ?? '—'}</Text>
            <Text style={styles.detailText}><Text style={styles.detailLabel}>{t('municipal.createdAt')}: </Text>{reportDetail.createdAt ? new Date(reportDetail.createdAt).toLocaleString() : '—'}</Text>

            <View style={styles.statusRow}>
              <Text style={styles.detailLabel}>{t('municipal.status.accepted')}: </Text>
              <TextInput style={styles.statusInput} value={newStatus} onChangeText={setNewStatus} autoCapitalize="none" />
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdateStatus} disabled={updating}>
                {updating ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>

            <Text style={styles.subTitle}>{t('municipal.interventionDetail')}</Text>
            {interventions.length === 0 ? <Text style={styles.emptyText}>{t('municipal.empty.noInterventions')}</Text> : <FlatList
              data={interventions}
              keyExtractor={item => String(item.id || item._id)}
              renderItem={({ item }) => <View style={styles.interventionCard}>
                <Text style={styles.interventionTitle}>#{item.id || item._id}</Text>
                <Text style={styles.interventionMeta}>{item.description || item.descrizione || '—'}</Text>
                <Text style={styles.interventionMeta}>{item.status || item.stato || '—'}</Text>
              </View>}
            />}
          </View> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { color: '#1976D2', fontSize: 16, marginRight: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: '#263238', padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { color: 'white', fontSize: 22, fontWeight: '700' },
  statLabel: { color: '#b0bec5', marginTop: 6, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  exportButton: { flex: 1, backgroundColor: '#4CAF50', padding: 14, borderRadius: 10, alignItems: 'center' },
  geoButton: { backgroundColor: '#1976D2' },
  exportText: { color: 'white', fontWeight: '700' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  refresh: { color: '#1976D2' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd' },
  filterChipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  filterChipText: { color: '#333', fontWeight: '600', fontSize: 12 },
  filterChipTextActive: { color: 'white' },
  list: { paddingBottom: 20 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 10, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700' },
  badge: { color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 11, overflow: 'hidden' },
  accepted: { backgroundColor: '#2e7d32' },
  inProgress: { backgroundColor: '#f39c12' },
  resolved: { backgroundColor: '#1976D2' },
  cardBody: { marginTop: 10, fontSize: 14, color: '#333' },
  cardMeta: { color: '#555', marginTop: 4, fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 16, marginBottom: 6, color: '#555' },
  fleetSection: { marginTop: 24 },
  fleetList: { paddingBottom: 20 },
  fleetCard: { backgroundColor: 'white', padding: 14, borderRadius: 10, marginRight: 10, minWidth: 180 },
  fleetId: { fontWeight: '700', marginBottom: 6 },
  fleetStatus: { color: '#555', fontSize: 12 },
  fleetLocation: { color: '#555', fontSize: 12 },
  modalContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { flex: 1, padding: 16 },
  detailText: { fontSize: 15, marginBottom: 10, color: '#222' },
  detailLabel: { fontWeight: '700', color: '#000' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 18 },
  statusInput: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  saveButton: { backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  saveButtonText: { color: 'white', fontWeight: '700' },
  subTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  interventionCard: { backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 8 },
  interventionTitle: { fontWeight: '700', marginBottom: 4 },
  interventionMeta: { color: '#555', fontSize: 13 },
});
