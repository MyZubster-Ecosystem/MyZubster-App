import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { listOrders } from '../services/orderService';

export default function OrderHistoryScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await listOrders();
      setOrders(data);
    } catch (error) {
      console.error('Errore caricamento storico ordini:', error);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusText = status => t(`dashboard.status.${status}`, { defaultValue: String(status || '').toUpperCase() });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>{t('common.loading')}</Text></View>;

  return <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.title}>{t('orderHistory.title', { defaultValue: 'Storico ordini' })}</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ {t('common.back', { defaultValue: 'Indietro' })}</Text></TouchableOpacity>
    </View>
    {orders.length === 0 ? <View style={styles.empty}><Text style={styles.emptyText}>{t('dashboard.noOrders', { defaultValue: 'Nessun ordine' })}</Text></View> : <FlatList
      data={orders}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      keyExtractor={item => String(item.id || item._id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <TouchableOpacity style={styles.orderCard} onPress={() => navigation.navigate('Order', { orderId: item.id || item._id })}>
        <View style={styles.orderHeader}><Text style={styles.orderId}>{t('dashboard.orderId', { id: item.id || item._id })}</Text><Text style={[styles.badge, item.status === 'completed' || item.status === 'cancelled' ? styles.completed : styles.pending]}>{statusText(item.status)}</Text></View>
        <Text style={styles.amount}>{item.moneroAmount ? `${Number(item.moneroAmount).toFixed(8)} XMR` : `${item.amount || '—'} ${item.currency || ''}`}</Text>
        {item.moneroAddress && <Text numberOfLines={1} style={styles.address}>{item.moneroAddress}</Text>}
        <Text style={styles.subtle}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
      </TouchableOpacity>}
    />}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  back: { color: '#1976D2', fontSize: 16 },
  list: { paddingBottom: 20 },
  orderCard: { backgroundColor: 'white', padding: 16, borderRadius: 10, marginBottom: 10 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '700' },
  badge: { color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 11, overflow: 'hidden' },
  pending: { backgroundColor: '#f39c12' },
  completed: { backgroundColor: '#2e7d32' },
  amount: { fontSize: 16, marginTop: 10, fontWeight: '600' },
  address: { color: '#4976aa', marginTop: 6, fontSize: 12 },
  subtle: { color: '#777', marginTop: 4, fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyText: { fontSize: 16, marginBottom: 6 },
});
