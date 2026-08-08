import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getReputation, getVerifierDashboard, reputationTier, verificationPoints, RAPID_VERIFICATION_HOURS, BASE_VERIFY_POINTS } from '../services/verificationService';

export default function ReputationScreen() {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const [rep, setRep] = useState(null);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const userId = user?.id || user?._id || user?.userId;
      if (userId) setRep(await getReputation(userId));
      setBoard(await getVerifierDashboard());
    } catch (error) {
      Alert.alert(t('verification.reputationTitle'), error.response?.data?.error || error.message || t('verification.loadFailed'));
    } finally { setLoading(false); setRefreshing(false); }
  }, [user, t]);

  useEffect(() => { load(); }, [load]);

  const score = Number(rep?.score ?? 0);
  const tier = reputationTier(score);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6200EE" /><Text>{t('common.loading')}</Text></View>;

  return <View style={styles.container}>
    <Text style={styles.title}>{t('verification.reputationTitle')}</Text>

    <View style={styles.scoreCard}>
      <Text style={styles.score}>{score} {t('verification.pts')}</Text>
      <Text style={styles.tier}>{t(`verification.tier.${tier}`)}</Text>
      {rep?.verifications != null && <Text style={styles.sub}>{t('verification.verifications', { count: rep.verifications })}</Text>}
    </View>

    <Text style={styles.section}>{t('verification.bonusModel')}</Text>
    <View style={styles.bonusRow}>
      <View style={styles.bonusCell}><Text style={styles.bonusNum}>{BASE_VERIFY_POINTS}</Text><Text style={styles.bonusLabel}>{t('verification.bonusBase')}</Text></View>
      <View style={styles.bonusCell}><Text style={styles.bonusNum}>+{verificationPoints({ ageHours: 1, matchedFinalVote: true }) - BASE_VERIFY_POINTS}</Text><Text style={styles.bonusLabel}>{t('verification.bonusRapidAccurate')}</Text></View>
      <View style={styles.bonusCell}><Text style={styles.bonusNum}>{RAPID_VERIFICATION_HOURS}h</Text><Text style={styles.bonusLabel}>{t('verification.bonusRapidWindow')}</Text></View>
    </View>

    <Text style={styles.section}>{t('verification.dashboardTitle')}</Text>
    {board ? (
      <FlatList
        data={board.topVerifiers || board.entries || []}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        keyExtractor={(item, i) => String(item.userId || item.id || i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('verification.dashboardEmpty')}</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{`#${index + 1}`}</Text>
            <View style={styles.rowBody}><Text style={styles.name}>{item.name || item.userName || item.userId || item.id}</Text><Text style={styles.tierInline}>{t(`verification.tier.${reputationTier(item.score)}`)}</Text></View>
            <Text style={styles.rowScore}>{Number(item.score ?? 0)} {t('verification.pts')}</Text>
          </View>
        )}
      />
    ) : (
      <Text style={styles.empty}>{t('verification.dashboardEmpty')}</Text>
    )}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  scoreCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 14 },
  score: { fontSize: 32, fontWeight: '800', color: '#6200EE' },
  tier: { fontSize: 15, fontWeight: '700', color: '#2e7d32', marginTop: 4 },
  sub: { color: '#777', marginTop: 6 },
  section: { fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 6 },
  bonusRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  bonusCell: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 12, alignItems: 'center' },
  bonusNum: { fontSize: 18, fontWeight: '800', color: '#6200EE' },
  bonusLabel: { fontSize: 11, color: '#777', textAlign: 'center', marginTop: 4 },
  list: { paddingBottom: 24 },
  empty: { textAlign: 'center', color: '#999', paddingTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, padding: 12, marginBottom: 8 },
  rank: { width: 46, fontWeight: '700' },
  rowBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  tierInline: { fontSize: 11, color: '#777' },
  rowScore: { fontSize: 15, fontWeight: '700', color: '#6200EE' },
});
