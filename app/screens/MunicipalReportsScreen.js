import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import {
  URBAN_REPORT_PRIORITIES,
  URBAN_REPORT_STATUSES,
  URBAN_REPORT_TYPES,
  URBAN_REPORT_TYPE_LABELS,
  URBAN_REPORT_PRIORITY_LABELS,
  URBAN_REPORT_STATUS_LABELS,
  listUrbanReports,
  updateUrbanReportStatus,
  getCategoryStats,
  getAverageResolutionTime,
  exportReportsCSV,
  exportReportsGeoJSON,
} from '../services/urbanReportService';

export default function MunicipalReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [exporting, setExporting] = useState(null); // 'csv' | 'geojson' | null
  const [showCategoryStats, setShowCategoryStats] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setReports(await listUrbanReports());
    } catch (error) {
      Alert.alert(
        'Dashboard comune',
        error.response?.data?.error || error.message || 'Impossibile caricare le segnalazioni.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Summary statistics ───────────────────────────────────────────────────

  const summary = useMemo(
    () =>
      reports.reduce(
        (stats, report) => {
          stats.total += 1;
          stats[report.status] = (stats[report.status] || 0) + 1;
          return stats;
        },
        { total: 0, reported: 0, in_progress: 0, resolved: 0 },
      ),
    [reports],
  );

  const categoryStats = useMemo(() => getCategoryStats(reports), [reports]);

  const avgResolutionDays = useMemo(
    () => getAverageResolutionTime(reports),
    [reports],
  );

  // ── Export helpers ───────────────────────────────────────────────────────

  const doExport = async (format) => {
    setExporting(format);
    try {
      const content =
        format === 'csv'
          ? exportReportsCSV(reports)
          : exportReportsGeoJSON(reports);
      const extension = format === 'csv' ? 'csv' : 'json';
      const mimeType =
        format === 'csv' ? 'text/csv' : 'application/geo+json';
      const fileName = `segnalazioni_urbane.${extension}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file — on iOS use the file URI, on Android share as text
      const shareContent =
        Platform.OS === 'ios'
          ? { url: fileUri, title: fileName }
          : { message: content, title: fileName };

      await Share.share(shareContent);
    } catch (error) {
      if (error.message !== 'User did not share') {
        Alert.alert(
          'Esportazione',
          error.message || 'Impossibile esportare i dati.',
        );
      }
    } finally {
      setExporting(null);
    }
  };

  // ── Status management ────────────────────────────────────────────────────

  const setStatus = async (report, status) => {
    setSavingId(report.id);
    try {
      const updated = await updateUrbanReportStatus(report.id, status);
      setReports(current =>
        current.map(item => (item.id === report.id ? updated : item)),
      );
    } catch (error) {
      Alert.alert(
        'Stato',
        error.response?.data?.error || error.message || 'Aggiornamento non riuscito.',
      );
    } finally {
      setSavingId(null);
    }
  };

  // ── Card rendering ───────────────────────────────────────────────────────

  const openMaps = (latitude, longitude) => {
    const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
    const url = Platform.OS === 'ios'
      ? `${scheme}0,0?q=${latitude},${longitude}`
      : `${scheme}${latitude},${longitude}?q=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Mappe', 'Impossibile aprire l\'applicazione mappe.');
    });
  };

  const renderReport = ({ item }) => (
    <View style={styles.card}>
      {/* Header: type + priority + status badge */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>
            {URBAN_REPORT_TYPE_LABELS[item.type] || item.type}
          </Text>
          <Text style={styles.meta}>
            {URBAN_REPORT_PRIORITY_LABELS[item.priority] || item.priority} priorità
          </Text>
        </View>
        <Text
          style={[
            styles.status,
            styles[`status_${item.status}`],
          ]}>
          {URBAN_REPORT_STATUS_LABELS[item.status] || item.status}
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.description}>
        {item.description || 'Nessuna descrizione'}
      </Text>

      {/* Enhanced POI visualization */}
      {item.location && (
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.coordinates}>
            {item.location.latitude.toFixed(5)},{' '}
            {item.location.longitude.toFixed(5)}
          </Text>
          <TouchableOpacity
            style={styles.mapLink}
            onPress={() =>
              openMaps(item.location.latitude, item.location.longitude)
            }>
            <Text style={styles.mapLinkText}>Apri in Maps</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Photos count */}
      <Text style={styles.meta}>
        {item.photos.length} foto allegate
      </Text>

      {/* Reporter name if available */}
      {item.reporterName ? (
        <Text style={styles.meta}>Segnalato da: {item.reporterName}</Text>
      ) : null}

      {/* Status actions */}
      <View style={styles.statusActions}>
        {URBAN_REPORT_STATUSES.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.statusButton,
              item.status === option.id && styles.statusButtonActive,
            ]}
            onPress={() => setStatus(item, option.id)}
            disabled={savingId === item.id || item.status === option.id}>
            <Text
              style={[
                styles.statusButtonText,
                item.status === option.id && styles.statusButtonTextActive,
              ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {savingId === item.id && (
        <ActivityIndicator style={styles.saving} color="#1976D2" />
      )}
    </View>
  );

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text>Caricamento segnalazioni...</Text>
      </View>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dashboard comune</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => navigation.navigate('UrbanReport')}>
          <Text style={styles.newButtonText}>Nuova</Text>
        </TouchableOpacity>
      </View>

      {/* Summary row: total / status counts */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary.total}</Text>
          <Text style={styles.summaryLabel}>Totali</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#f39c12' }]}>
            {summary.reported}
          </Text>
          <Text style={styles.summaryLabel}>Segnalati</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#1976D2' }]}>
            {summary.in_progress}
          </Text>
          <Text style={styles.summaryLabel}>In corso</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#2e7d32' }]}>
            {summary.resolved}
          </Text>
          <Text style={styles.summaryLabel}>Risolti</Text>
        </View>
      </View>

      {/* Average resolution time */}
      {avgResolutionDays !== null && (
        <View style={styles.avgResolution}>
          <Text style={styles.avgResolutionLabel}>
            Tempo medio di risoluzione
          </Text>
          <Text style={styles.avgResolutionValue}>
            {avgResolutionDays} {avgResolutionDays === 1 ? 'giorno' : 'giorni'}
          </Text>
        </View>
      )}

      {/* Category statistics toggle */}
      <TouchableOpacity
        style={styles.sectionToggle}
        onPress={() => setShowCategoryStats(prev => !prev)}>
        <Text style={styles.sectionToggleText}>
          {showCategoryStats
            ? 'Nascondi statistiche per categoria'
            : 'Mostra statistiche per categoria'}
        </Text>
      </TouchableOpacity>

      {showCategoryStats && (
        <View style={styles.categoryStats}>
          {URBAN_REPORT_TYPES.map(type => {
            const stat = categoryStats[type.id];
            return (
              <View key={type.id} style={styles.categoryItem}>
                <Text style={styles.categoryLabel}>{stat.label}</Text>
                <View style={styles.categoryBar}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: summary.total > 0
                          ? `${Math.round((stat.count / summary.total) * 100)}%`
                          : '0%',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.categoryCount}>{stat.count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Export buttons */}
      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
          onPress={() => doExport('csv')}
          disabled={exporting !== null || reports.length === 0}>
          {exporting === 'csv' ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.exportButtonText}>📄 Esporta CSV</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
          onPress={() => doExport('geojson')}
          disabled={exporting !== null || reports.length === 0}>
          {exporting === 'geojson' ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.exportButtonText}>🗺️ Esporta GeoJSON</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Reports list */}
      <FlatList
        data={reports}
        keyExtractor={(item, index) =>
          String(item.id || `${item.type}-${item.createdAt || index}`)
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        contentContainerStyle={styles.list}
        renderItem={renderReport}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>Nessuna segnalazione urbana presente.</Text>
          </View>
        }
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#1976D2', fontSize: 16 },
  title: { fontSize: 24, fontWeight: '800', flex: 1, textAlign: 'center' },
  newButton: { backgroundColor: '#2e7d32', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  newButtonText: { color: 'white', fontWeight: '800' },

  // Summary
  summary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryItem: { flex: 1, backgroundColor: 'white', borderRadius: 8, padding: 10, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#2e7d32' },
  summaryLabel: { color: '#666', fontSize: 12, marginTop: 4 },

  // Average resolution time
  avgResolution: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avgResolutionLabel: { color: '#2e7d32', fontWeight: '600', fontSize: 14 },
  avgResolutionValue: { color: '#1b5e20', fontWeight: '800', fontSize: 16 },

  // Category toggle
  sectionToggle: { marginBottom: 8 },
  sectionToggleText: { color: '#1976D2', fontWeight: '600', fontSize: 14 },

  // Category stats
  categoryStats: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  categoryItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryLabel: { width: 100, fontWeight: '600', color: '#333', fontSize: 13 },
  categoryBar: { flex: 1, height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden' },
  categoryBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 5 },
  categoryCount: { width: 30, textAlign: 'right', fontWeight: '700', color: '#333' },

  // Export
  exportRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  exportButton: {
    flex: 1,
    backgroundColor: '#263238',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonDisabled: { opacity: 0.6 },
  exportButtonText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // List
  list: { paddingBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 10, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitleBlock: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  status: {
    color: 'white',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  status_reported: { backgroundColor: '#f39c12' },
  status_in_progress: { backgroundColor: '#1976D2' },
  status_resolved: { backgroundColor: '#2e7d32' },
  description: { color: '#333', marginTop: 10, lineHeight: 20 },

  // POI / location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f0f4f8',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  locationIcon: { fontSize: 16 },
  coordinates: { color: '#555', fontFamily: 'monospace', fontSize: 12, flex: 1 },
  mapLink: { backgroundColor: '#1976D2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  mapLinkText: { color: 'white', fontWeight: '700', fontSize: 12 },

  meta: { color: '#666', marginTop: 5 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statusButton: {
    borderWidth: 1,
    borderColor: '#d6d6d6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statusButtonActive: { backgroundColor: '#263238', borderColor: '#263238' },
  statusButtonText: { color: '#333', fontWeight: '700' },
  statusButtonTextActive: { color: 'white' },
  saving: { marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 40 },
});