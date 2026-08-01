import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLanguage } from '../context/LanguageContext';
import { listAIReports, verifyReport } from '../services/wasteDetectionService';

const STATUS_FILTERS = ['all', 'pending_verification', 'verified', 'rejected'];

export default function AIReportsDashboardScreen({ navigation }) {
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const data = await listAIReports(params);
      setReports(data);
    } catch (error) {
      Alert.alert(t('common.error'), error.response?.data?.error || error.message || t('wasteDetection.alert.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, t]);

  useEffect(() => { load(); }, [load]);

  const handleVerify = useCallback(async (reportId, action) => {
    setVerifying(true);
    try {
      await verifyReport(reportId, action);
      Alert.alert(t('common.success'), t('wasteDetection.alert.verifySuccess'));
      setSelectedReport(null);
      load(true);
    } catch (error) {
      Alert.alert(t('common.error'), error.response?.data?.error || error.message || t('wasteDetection.alert.verifyFailed'));
    } finally {
      setVerifying(false);
    }
  }, [t, load]);

  const renderReport = ({ item }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => setSelectedReport(selectedReport?.id === item.id ? null : item)}
    >
      <View style={styles.reportHeader}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailPlaceholderText}>📷</Text>
          </View>
        )}
        <View style={styles.reportInfo}>
          <Text style={styles.reportWasteType}>
            {t(`wasteDetection.categories.${item.wasteType}`, { defaultValue: item.wasteType })}
          </Text>
          <View style={styles.confidenceRow}>
            <View style={styles.confidenceBarOuter}>
              <View
                style={[
                  styles.confidenceBarInner,
                  {
                    width: `${Math.round((item.confidence || 0) * 100)}%`,
                    backgroundColor: (item.confidence || 0) >= 0.7 ? '#4CAF50' : '#f39c12',
                  },
                ]}
              />
            </View>
            <Text style={styles.confidenceText}>{Math.round((item.confidence || 0) * 100)}%</Text>
          </View>
          <Text style={styles.reportDate}>
            {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, statusBadgeColor(item.status)]}>
          <Text style={styles.statusBadgeText}>
            {t(`wasteDetection.status.${item.status}`, { defaultValue: item.status || 'pending_verification' })}
          </Text>
        </View>
      </View>

      {selectedReport?.id === item.id && (
        <View style={styles.reportDetail}>
          {(item.latitude && item.longitude) && (
            <MapView
              style={styles.miniMap}
              scrollEnabled={false}
              zoomEnabled={false}
              initialRegion={{
                latitude: item.latitude,
                longitude: item.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                title={t(`wasteDetection.categories.${item.wasteType}`, { defaultValue: item.wasteType })}
              />
            </MapView>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('wasteDetection.coordinates')}</Text>
            <Text style={styles.detailValue}>
              {item.latitude?.toFixed(5)}, {item.longitude?.toFixed(5)}
            </Text>
          </View>
          {item.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('wasteDetection.notes')}</Text>
              <Text style={styles.detailValue}>{item.notes}</Text>
            </View>
          )}

          {item.status === 'pending_verification' && (
            <View style={styles.verifyRow}>
              <TouchableOpacity
                style={[styles.verifyButton, styles.verifyApprove]}
                onPress={() => handleVerify(item.id, 'verified')}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.verifyText}>{t('wasteDetection.verify')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.verifyButton, styles.verifyReject]}
                onPress={() => handleVerify(item.id, 'rejected')}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.verifyText}>{t('wasteDetection.reject')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && reports.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{'‹ '}{t('wasteDetection.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('wasteDetection.dashboardTitle')}</Text>
        <TouchableOpacity onPress={() => load(true)}>
          <Text style={styles.refresh}>{t('wasteDetection.refresh')}</Text>
        </TouchableOpacity>
      </View>

      {/* Status filter tabs */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
              {t(`wasteDetection.statusFilter.${status}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats summary */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{reports.length}</Text>
          <Text style={styles.statLabel}>{t('wasteDetection.total')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#f39c12' }]}>
            {reports.filter(r => r.status === 'pending_verification').length}
          </Text>
          <Text style={styles.statLabel}>{t('wasteDetection.pending')}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
            {reports.filter(r => r.status === 'verified').length}
          </Text>
          <Text style={styles.statLabel}>{t('wasteDetection.verified')}</Text>
        </View>
      </View>

      {/* Report list */}
      <FlatList
        data={reports}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        keyExtractor={item => String(item.id || item._id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('wasteDetection.noReports')}</Text>
          </View>
        }
        renderItem={renderReport}
      />
    </View>
  );
}

function statusBadgeColor(status) {
  switch (status) {
    case 'verified': return { backgroundColor: '#E8F5E9' };
    case 'rejected': return { backgroundColor: '#FFEBEE' };
    default: return { backgroundColor: '#FFF8E1' };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 16, color: '#555' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back: { color: '#1976D2', fontSize: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  refresh: { color: '#1976D2', fontSize: 14 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd' },
  filterChipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  filterChipText: { fontSize: 13, color: '#555' },
  filterChipTextActive: { color: 'white', fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 12, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#333' },
  statLabel: { fontSize: 12, color: '#777', marginTop: 2 },

  list: { paddingHorizontal: 16, paddingBottom: 24 },

  reportCard: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 1 },
  reportHeader: { flexDirection: 'row', alignItems: 'center' },
  thumbnail: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#eee' },
  thumbnailPlaceholder: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  thumbnailPlaceholderText: { fontSize: 24 },
  reportInfo: { flex: 1, marginLeft: 12 },
  reportWasteType: { fontSize: 16, fontWeight: '600' },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  confidenceBarOuter: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, flex: 1, marginRight: 6 },
  confidenceBarInner: { height: 8, borderRadius: 4 },
  confidenceText: { fontSize: 12, fontWeight: '700', width: 32, textAlign: 'right' },
  reportDate: { fontSize: 11, color: '#999', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },

  reportDetail: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  miniMap: { height: 120, borderRadius: 8, marginBottom: 10 },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { fontSize: 14, color: '#555', width: 80 },
  detailValue: { fontSize: 14, color: '#333', flex: 1 },

  verifyRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  verifyButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  verifyApprove: { backgroundColor: '#4CAF50' },
  verifyReject: { backgroundColor: '#c62828' },
  verifyText: { color: 'white', fontWeight: '700', fontSize: 15 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#777' },
});