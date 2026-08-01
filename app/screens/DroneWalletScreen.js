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
import { useLanguage } from '../context/LanguageContext';
import { getDroneWallet, getDroneTransactions, isDroneEndpointError } from '../services/droneWalletService';

const formatXmr = value => Number(value || 0).toFixed(8);

export default function DroneWalletScreen({ navigation }) {
  const { t } = useLanguage();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [summary, history] = await Promise.all([getDroneWallet(), getDroneTransactions()]);
      setWallet(summary);
      setTransactions(history);
    } catch (error) {
      if (isDroneEndpointError(error)) {
        Alert.alert('Drone Wallet', 'Il Gateway deve esporre /drone/wallet e /drone/wallet/transactions.');
      } else {
        Alert.alert('Drone Wallet', error.response?.data?.error || error.message || 'Impossibile caricare il wallet drone.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const balance = wallet?.balance ?? wallet?.unlockedBalance ?? wallet?.unlocked_balance ?? 0;
  const address = wallet?.address || wallet?.moneroAddress || '';

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>{t('common.loading')}</Text></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ {t('order.back')}</Text></TouchableOpacity>
        <Text style={styles.title}>Drone Wallet</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.caption}>Saldo drone</Text>
        <Text style={styles.balance}>{formatXmr(balance)} XMR</Text>
        <Text style={styles.addressLabel}>Indirizzo: {address ? `${address.slice(0, 12)}...${address.slice(-8)}` : 'N/A'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Transazioni drone</Text>
        {transactions.length === 0 ? <Text style={styles.muted}>Nessuna transazione.</Text> : <FlatList
          scrollEnabled={false}
          data={transactions}
          keyExtractor={(item, index) => String(item.txid || item.txHash || item.id || index)}
          renderItem={({ item }) => <View style={styles.txRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txType}>{item.type || (item.incoming ? 'Ricevuta' : 'Inviata')}</Text>
              <Text style={styles.muted}>{item.taskId ? `Task #${item.taskId}` : ''} {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
            </View>
            <Text style={item.type === 'outgoing' ? styles.outgoing : styles.incoming}>{item.type === 'outgoing' ? '-' : '+'}{formatXmr(item.amount)} XMR</Text>
          </View>}
        />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { color: '#1976D2', fontSize: 16, marginRight: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  balanceCard: { backgroundColor: '#1a237e', padding: 20, borderRadius: 14, marginBottom: 14 },
  caption: { color: '#9fa8da' },
  balance: { color: 'white', fontSize: 30, fontWeight: '700', marginVertical: 8 },
  addressLabel: { color: '#c5cae9', fontSize: 12 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  txType: { fontWeight: '600' },
  incoming: { color: '#2e7d32', fontWeight: '700' },
  outgoing: { color: '#c62828', fontWeight: '700' },
  muted: { color: '#777', fontSize: 12 },
});
