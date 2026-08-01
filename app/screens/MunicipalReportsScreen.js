import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  URBAN_REPORT_PRIORITIES,
  URBAN_REPORT_STATUSES,
  URBAN_REPORT_TYPES,
  listUrbanReports,
  updateUrbanReportStatus,
} from '../services/urbanReportService';
import {
  getDefaultAutoPaymentAmount,
  isAutoPaymentEndpointError,
  triggerReportPayment,
} from '../services/autoPaymentService';

const typeLabels = Object.fromEntries(URBAN_REPORT_TYPES.map(option => [option.id, option.label]));
const priorityLabels = Object.fromEntries(URBAN_REPORT_PRIORITIES.map(option => [option.id, option.label]));
const statusLabels = Object.fromEntries(URBAN_REPORT_STATUSES.map(option => [option.id, option.label]));

export default function MunicipalReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      setReports(await listUrbanReports());
    } catch (error) {
      Alert.alert('Dashboard comune', error.response?.data?.error || error.message || 'Impossibile caricare le segnalazioni.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => reports.reduce((stats, report) => {
    stats.total += 1;
    stats[report.status] = (stats[report.status] || 0) + 1;
    return stats;
  }, { total: 0, reported: 0, in_progress: 0, resolved: 0 }), [reports]);

  const setStatus = async (report, status) => {
    setSavingId(report.id);
    try {
      const updated = await updateUrbanReportStatus(report.id, status);
      setReports(current => current.map(item => (item.id === report.id ? updated : item)));

      // Auto-payment: when a report is resolved, trigger XMR reward to the reporter.
      if (status === 'resolved') {
        try {
          await triggerReportPayment(report.id, {
            amount: getDefaultAutoPaymentAmount('report'),
          });
        } catch (payError) {
          if (!isAutoPaymentEndpointError(payError)) {
            console.warn('Auto-payment trigger failed:', payError.response?.data || payError.message);
          }
          // Silently degrade if the auto-payment endpoint is not yet deployed.
        }
      }
    } catch (error) {
      Alert.alert('Stato', error.response?.data?.error || error.message || 'Aggiornamento non riuscito.');
    } finally {
      setSavingId(null);
    }
  };

  const renderReport = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>{typeLabels[item.type] || item.type}</Text>
          <Text style={styles.meta}>{priorityLabels[item.priority] || item.priority} priorita</Text>
        </View>
        <Text style={[styles.status, styles[`status_${item.status}`]]}>{statusLabels[item.status] || item.status}</Text>
      </View>
      <Text style={styles.description}>{item.description || 'Nessuna descrizione'}</Text>
      {item.location && <Text style={styles.meta}>{item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}</Text>}
      <Text style={styles.meta}>{item.photos.length} foto allegate</Text>
      <View style={styles.statusActions}>
        {URBAN_REPORT_STATUSES.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[styles.statusButton, item.status === option.id && styles.statusButtonActive]}
            onPress={() => setStatus(item, option.id)}
            disabled={savingId === item.id || item.status === option.id}
          >
            <Text style={[styles.statusButtonText, item.status === option.id && styles.statusButtonTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {savingId === item.id && <ActivityIndicator style={styles.saving} color="#1976D2" />}
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>Caricamento segnalazioni...</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>Indietro</Text></TouchableOpacity>
        <Text style={styles.title}>Dashboard comune</Text>
        <TouchableOpacity style={styles.newButton} onPress={() => navigation.navigate('UrbanReport')}>
          <Text style={styles.newButtonText}>Nuova</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{summary.total}</Text><Text style={styles.summaryLabel}>Totali</Text></View>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{summary.reported}</Text><Text style={styles.summaryLabel}>Segnalati</Text></View>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{summary.in_progress}</Text><Text style={styles.summaryLabel}>In corso</Text></View>
        <View style={styles.summaryItem}><Text style={styles.summaryValue}>{summary.resolved}</Text><Text style={styles.summaryLabel}>Risolti</Text></View>
      </View>
      <FlatList
        data={reports}
        keyExtractor={(item, index) => String(item.id || `${item.type}-${item.createdAt || index}`)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        contentContainerStyle={styles.list}
        renderItem={renderReport}
        ListEmptyComponent={<View style={styles.empty}><Text>Nessuna segnalazione urbana presente.</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { marginBottom: 12 },
  back: { color: '#1976D2', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800' },
  newButton: { position: 'absolute', right: 0, bottom: 0, backgroundColor: '#2e7d32', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  newButtonText: { color: 'white', fontWeight: '800' },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryItem: { flex: 1, backgroundColor: 'white', borderRadius: 8, padding: 10, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#2e7d32' },
  summaryLabel: { color: '#666', fontSize: 12, marginTop: 4 },
  list: { paddingBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 10, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitleBlock: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  status: { color: 'white', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  status_reported: { backgroundColor: '#f39c12' },
  status_in_progress: { backgroundColor: '#1976D2' },
  status_resolved: { backgroundColor: '#2e7d32' },
  description: { color: '#333', marginTop: 10, lineHeight: 20 },
  meta: { color: '#666', marginTop: 5 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statusButton: { borderWidth: 1, borderColor: '#d6d6d6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  statusButtonActive: { backgroundColor: '#263238', borderColor: '#263238' },
  statusButtonText: { color: '#333', fontWeight: '700' },
  statusButtonTextActive: { color: 'white' },
  saving: { marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 40 },
});
