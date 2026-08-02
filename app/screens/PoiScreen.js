import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { POI_CATEGORIES, listPois, votePoi, poiVerificationProgress } from '../services/poiService';

const STATUS_FILTERS = ['all', 'pending', 'verified'];

export default function PoiScreen({ navigation }) {
  const { t } = useLanguage();
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [voting, setVoting] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await listPois({ category, status: status === 'all' ? undefined : status });
      setPois(data);
    } catch (error) {
      Alert.alert(t('poi.title'), error.response?.data?.error || error.message || t('poi.loadFailed'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [category, status, t]);

  useEffect(() => { load(); }, [load]);

  const verify = useCallback(async (poi) => {
    setVoting(true);
    try {
      const updated = await votePoi(poi.id || poi._id, 'approve');
      const progress = poiVerificationProgress(updated || poi);
      Alert.alert(t('common.success'), progress.verified ? t('poi.verified') : t('poi.voteAccepted', { approvals: progress.approvals, required: progress.required }));
      setSelected(updated);
      await load(true);
    } catch (error) {
      Alert.alert(t('common.error'), error.response?.data?.error || error.message || t('poi.voteFailed'));
    } finally { setVoting(false); }
  }, [load, t]);

  const rows = useMemo(() => pois.map((p) => ({ ...p, progress: poiVerificationProgress(p) })), [pois]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>{t('common.loading')}</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
        <Text style={styles.title}>{t('poi.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddPoi')}><Text style={styles.addBtnText}>+ {t('poi.add')}</Text></TouchableOpacity>
      </View>
      <View style={styles.filters}>
        <TextInput style={styles.filterInput} placeholder={t('poi.categoryPlaceholder')} value={category} onChangeText={setCategory} autoCapitalize="none" />
        <View style={styles.statusRow}>
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity key={s} style={[styles.statusChip, status === s && styles.statusChipActive]} onPress={() => setStatus(s)}>
              <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>{t(`poi.status.${s}`, { defaultValue: s })}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => load()}><Text style={styles.filterText}>{t('poi.filter')}</Text></TouchableOpacity>
      </View>
      {rows.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>{t('poi.empty')}</Text></View>
      ) : (
        <FlatList
          data={rows}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          keyExtractor={(item) => String(item.id || item._id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{item.name || t('poi.untitled')}</Text>
                <Text style={[styles.badge, item.progress.verified ? styles.badgeVerified : styles.badgePending]}>{item.progress.verified ? t('poi.status.verified') : `${item.progress.approvals}/${item.progress.required}`}</Text>
              </View>
              <Text style={styles.cardMeta}>📍 {t(`poi.categories.${item.category}`, { defaultValue: item.category })}</Text>
              {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
            </TouchableOpacity>
          )}
        />
      )}
      {selected && (
        <View style={styles.detail}>
          <TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.close}>×</Text></TouchableOpacity>
          <Text style={styles.detailTitle}>{selected.name || t('poi.untitled')}</Text>
          <Text style={styles.detailMeta}>📍 {selected.latitude?.toFixed(5)}, {selected.longitude?.toFixed(5)} · {t(`poi.categories.${selected.category}`, { defaultValue: selected.category })}</Text>
          {selected.description ? <Text style={styles.detailDesc}>{selected.description}</Text> : null}
          <Text style={styles.votesText}>{t('poi.verifications', { approvals: selected.progress.approvals, required: selected.progress.required })}</Text>
          <View style={styles.detailActions}>
            {!selected.progress.verified && (
              <TouchableOpacity style={[styles.voteBtn, voting && styles.voteBtnDisabled]} disabled={voting} onPress={() => verify(selected)}>
                <Text style={styles.voteBtnText}>{voting ? t('common.loading') : t('poi.verify')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}><Text style={styles.closeBtnText}>{t('common.close')}</Text></TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  back: { color: '#1976D2', fontSize: 16 },
  title: { fontSize: 22, fontWeight: '700', flex: 1, marginLeft: 8 },
  addBtn: { backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { color: 'white', fontWeight: '700' },
  filters: { paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  filterInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  statusRow: { flexDirection: 'row', gap: 6 },
  statusChip: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  statusChipActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  statusChipText: { color: '#555', fontSize: 13 },
  statusChipTextActive: { color: 'white', fontWeight: '700' },
  filterButton: { backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 14, padding: 10, alignItems: 'center' },
  filterText: { color: 'white', fontWeight: '700' },
  list: { padding: 16, paddingTop: 4 },
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyText: { fontSize: 16, color: '#666' },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 10, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '700', flex: 1 },
  badge: { color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 11, overflow: 'hidden' },
  badgePending: { backgroundColor: '#f39c12' },
  badgeVerified: { backgroundColor: '#2e7d32' },
  cardMeta: { color: '#666', fontSize: 13 },
  cardDesc: { color: '#444', marginTop: 6 },
  detail: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 5 },
  close: { position: 'absolute', right: 14, top: 8, fontSize: 24, color: '#666' },
  detailTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  detailMeta: { color: '#666', fontSize: 13 },
  detailDesc: { marginTop: 8, color: '#333' },
  votesText: { marginTop: 10, color: '#2e7d32', fontWeight: '600' },
  detailActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  voteBtn: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 8, padding: 12, alignItems: 'center' },
  voteBtnDisabled: { backgroundColor: '#a5d6a7' },
  voteBtnText: { color: 'white', fontWeight: '700' },
  closeBtn: { borderWidth: 1, borderColor: '#4CAF50', borderRadius: 8, padding: 12, alignItems: 'center' },
  closeBtnText: { color: '#2e7d32', fontWeight: '700' },
});
