import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { getPendingVerifications, verifyItem, verificationProgress } from '../services/verificationService';

export default function VerificationScreen({ navigation }) {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [voting, setVoting] = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      setItems(await getPendingVerifications());
    } catch (error) {
      Alert.alert(t('verification.title'), error.response?.data?.error || error.message || t('verification.loadFailed'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const onVerify = async (item) => {
    const id = item.id || item._id;
    setVoting(id);
    try {
      await verifyItem(id, 'approve');
      await load(true);
      Alert.alert(t('verification.title'), t('verification.voteAccepted', { approvals: verificationProgress(item).approvals + 1 }));
    } catch (error) {
      Alert.alert(t('verification.title'), error.response?.data?.error || error.message || t('verification.voteFailed'));
    } finally { setVoting(null); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6200EE" /><Text>{t('common.loading')}</Text></View>;

  return <View style={styles.container}>
    <View style={styles.titleRow}>
      <Text style={styles.title}>{t('verification.title')}</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Reputation')}><Text style={styles.link}>{t('verification.reputationTitle')}</Text></TouchableOpacity>
    </View>
    <Text style={styles.sub}>{t('verification.subtitle')}</Text>
    <FlatList
      data={items}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      keyExtractor={(item, i) => String(item.id || item._id || i)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>{t('verification.empty')}</Text>}
      renderItem={({ item }) => {
        const p = verificationProgress(item);
        return (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.name} numberOfLines={1}>{item.name || item.title || item.type || t('verification.untitled')}</Text>
          <Text style={[styles.badge, p.verified ? styles.verifiedBadge : styles.pendingBadge]}>{t(`verification.status.${p.status}`)}</Text>
            </View>
            {item.category ? <Text style={styles.meta}>{item.category}</Text> : null}
            {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
            <Text style={styles.progress}>{t('verification.progress', { approvals: p.approvals, required: p.required })}</Text>
            <View style={styles.barBg}><View style={[styles.barFill, { width: `${Math.min(100, Math.round((p.approvals / p.required) * 100))}%` }]} /></View>
            <TouchableOpacity style={[styles.verifyBtn, voting === (item.id || item._id) && styles.verifyBtnBusy]} disabled={voting === (item.id || item._id)} onPress={() => onVerify(item)}>
              <Text style={styles.verifyBtnText}>{voting === (item.id || item._id) ? t('common.loading') : t('verification.verify')}</Text>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { color: '#1976D2', fontWeight: '700' },
  sub: { color: '#777', marginVertical: 8 },
  list: { paddingBottom: 24 },
  empty: { textAlign: 'center', color: '#999', paddingTop: 40 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  badge: { color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 11, overflow: 'hidden' },
  pendingBadge: { backgroundColor: '#f39c12' },
  verifiedBadge: { backgroundColor: '#2e7d32' },
  meta: { color: '#777', marginTop: 4, fontSize: 12 },
  desc: { color: '#555', marginTop: 6 },
  progress: { color: '#555', fontSize: 12, marginTop: 8 },
  barBg: { width: '100%', height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  barFill: { height: 6, backgroundColor: '#6200EE', borderRadius: 3 },
  verifyBtn: { marginTop: 10, backgroundColor: '#6200EE', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  verifyBtnBusy: { backgroundColor: '#9e9e9e' },
  verifyBtnText: { color: 'white', fontWeight: '700' },
});
