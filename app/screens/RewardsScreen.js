import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useLanguage } from '../context/LanguageContext';
import {
  claimReward,
  getRewardHistory,
  getRewardStats,
  getRewards,
  isRewardsEndpointError,
} from '../services/rewardsService';

const formatXmr = value => Number(value || 0).toFixed(8);
const pickAddress = stats =>
  stats?.walletAddress || stats?.moneroAddress || stats?.address || '';

export default function RewardsScreen({ navigation }) {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [nextStats, nextHistory] = await Promise.all([
        getRewards(),
        getRewardHistory(),
      ]);
      setStats(nextStats);
      setHistory(nextHistory);
    } catch (error) {
      if (isRewardsEndpointError(error)) {
        Alert.alert(t('rewards.title'), t('rewards.alert.endpointMissing'));
      } else {
        Alert.alert(t('rewards.title'), t('rewards.alert.loadFailed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleClaim = async (rewardId) => {
    if (!rewardId || claiming) return;
    setClaiming(true);
    try {
      await claimReward(rewardId);
      Alert.alert(t('rewards.alert.claimSuccess'));
      await load(true);
    } catch (error) {
      Alert.alert(t('rewards.title'), t('rewards.alert.claimFailed'));
    } finally {
      setClaiming(false);
    }
  };

  const balance = stats?.totalEarned ?? stats?.balance ?? 0;
  const reportsVerified = stats?.reportsVerified ?? 0;
  const droneTasks = stats?.droneTasks ?? 0;
  const address = pickAddress(stats);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>{t('common.loading')}</Text></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ {t('rewards.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('rewards.title')}</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.caption}>{t('rewards.balance')}</Text>
        <Text style={styles.balance}>{formatXmr(balance)} XMR</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{reportsVerified}</Text>
            <Text style={styles.statLabel}>{t('rewards.reportsVerified')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{droneTasks}</Text>
            <Text style={styles.statLabel}>{t('rewards.droneTasks')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('rewards.history')}</Text>
        {history.length === 0 ? (
          <Text style={styles.muted}>{t('rewards.noHistory')}</Text>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={history}
            keyExtractor={(item, index) => String(item.id || item.txid || index)}
            renderItem={({ item }) => (
              <View style={styles.txRow}>
                <View style={styles.txInfo}>
                  <Text style={styles.txType}>{item.description || item.type || t('rewards.history')}</Text>
                  <Text style={styles.muted}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : item.date || '—'}
                  </Text>
                  {item.status && <Text style={styles.muted}>{item.status}</Text>}
                  {item.claimable && (
                    <TouchableOpacity style={styles.claimButton} onPress={() => handleClaim(item.id || item.rewardId)} disabled={claiming}>
                      <Text style={styles.claimText}>{t('rewards.claim')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.incoming}>+{formatXmr(item.amount)} XMR</Text>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('rewards.address')}</Text>
        {address ? (
          <>
            <View style={styles.qrWrap}>
              <QRCode value={`monero:${address}`} size={180} backgroundColor="white" />
            </View>
            <Text selectable style={styles.address}>{address}</Text>
          </>
        ) : (
          <Text style={styles.muted}>{t('rewards.walletMissing')}</Text>
        )}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => load(true)} disabled={refreshing}>
        {refreshing ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('rewards.refresh')}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { color: '#1976D2', fontSize: 16, marginRight: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  balanceCard: { backgroundColor: '#17351f', padding: 20, borderRadius: 14, marginBottom: 14 },
  caption: { color: '#b8d9bf' },
  balance: { color: 'white', fontSize: 30, fontWeight: '700', marginVertical: 8 },
  statsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  statItem: { flex: 1 },
  statValue: { color: 'white', fontSize: 20, fontWeight: '700' },
  statLabel: { color: '#b8d9bf', fontSize: 12 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  muted: { color: '#777' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  txInfo: { flex: 1, paddingRight: 8 },
  txType: { fontWeight: '600' },
  incoming: { color: '#2e7d32', fontWeight: '700' },
  claimButton: { alignSelf: 'flex-start', backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 6 },
  claimText: { color: 'white', fontWeight: '700', fontSize: 13 },
  qrWrap: { alignItems: 'center', padding: 10, marginBottom: 8 },
  address: { color: '#1e5aa8', fontSize: 12, textAlign: 'center' },
  primaryButton: { backgroundColor: '#4CAF50', padding: 13, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: 'white', fontWeight: '700' },
});
