import React, { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { listOrders } from '../services/orderService';
import { connectOrbot, getOrbotStatus } from '../services/orbotService';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orbot, setOrbot] = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [nextOrders, nextOrbot] = await Promise.all([listOrders(), getOrbotStatus()]);
      setOrders(nextOrders);
      setOrbot(nextOrbot);
    } catch (error) {
      Alert.alert('Ordini', error.response?.data?.error || error.message || 'Impossibile caricare gli ordini.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOrbot = async () => {
    if (!orbot?.installed) return navigation.navigate('Privacy');
    try { setOrbot(await connectOrbot()); } catch (error) { Alert.alert('Orbot', error.message); }
  };

  const statusText = status => t(`dashboard.status.${status}`, { defaultValue: String(status || '').toUpperCase() });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>{t('common.loading')}</Text></View>;

  return <View style={styles.container}>
    <View style={styles.header}>
      <View style={styles.headerText}><Text style={styles.welcome}>{t('dashboard.welcome', { name: user?.name || user?.email || 'Utente' })}</Text><Text style={styles.subtle}>{orbot?.trafficTunneled ? '🧅 Tor attivo' : orbot?.requested ? '🧅 Orbot avviato (proxy non attivo)' : 'Privacy non configurata'}</Text></View>
      <TouchableOpacity onPress={logout}><Text style={styles.logout}>Esci</Text></TouchableOpacity>
    </View>
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('Wallet')}><Text style={styles.actionEmoji}>💰</Text><Text>Wallet</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('Privacy')}><Text style={styles.actionEmoji}>🧅</Text><Text>Privacy</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('CreateOrder')}><Text style={styles.actionEmoji}>📦</Text><Text>Nuovo ordine</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('Rewards')}><Text style={styles.actionEmoji}>🎁</Text><Text>{t('rewards.title')}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('DroneFleet')}><Text style={styles.actionEmoji}>🚁</Text><Text>{t('droneFleet.title')}</Text></TouchableOpacity>
    </View>
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('Map')}><Text style={styles.actionEmoji}>MAP</Text><Text>Mappa</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('UrbanReport')}><Text style={styles.actionEmoji}>RPT</Text><Text>Segnala</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('MunicipalReports')}><Text style={styles.actionEmoji}>ADM</Text><Text>Comune</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('Gamification')}><Text style={styles.actionEmoji}>PTS</Text><Text>Punti</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('Notifications')}><Text style={styles.actionEmoji}>NTF</Text><Text>Notifiche</Text></TouchableOpacity>
    </View>
    <TouchableOpacity style={styles.torButton} onPress={handleOrbot}><Text style={styles.torText}>{orbot?.installed ? 'Avvia Orbot' : 'Configura privacy'}</Text></TouchableOpacity>
    <View style={styles.titleRow}><Text style={styles.sectionTitle}>{t('dashboard.title')}</Text><TouchableOpacity onPress={() => load(true)}><Text style={styles.refresh}>Aggiorna</Text></TouchableOpacity></View>
    {orders.length === 0 ? <View style={styles.empty}><Text style={styles.emptyText}>{t('dashboard.noOrders')}</Text><Text style={styles.subtle}>{t('dashboard.noOrdersSub')}</Text></View> : <FlatList
      data={orders}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      keyExtractor={item => String(item.id || item._id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <TouchableOpacity style={styles.orderCard} onPress={() => navigation.navigate('Order', { orderId: item.id || item._id })}>
        <View style={styles.orderHeader}><Text style={styles.orderId}>{t('dashboard.orderId', { id: item.id || item._id })}</Text><Text style={[styles.badge, item.status === 'completed' ? styles.completed : styles.pending]}>{statusText(item.status)}</Text></View>
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
  headerText: { flex: 1 }, welcome: { fontSize: 20, fontWeight: '700' }, subtle: { color: '#777', marginTop: 4 }, logout: { color: '#c62828', fontWeight: '600' },
  quickActions: { flexDirection: 'row', gap: 8, marginBottom: 10 }, action: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 12, alignItems: 'center' }, actionEmoji: { fontSize: 24, marginBottom: 4 },
  torButton: { borderWidth: 1, borderColor: '#7B2FBE', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 18 }, torText: { color: '#7B2FBE', fontWeight: '700' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 }, refresh: { color: '#1976D2' }, list: { paddingBottom: 20 },
  orderCard: { backgroundColor: 'white', padding: 16, borderRadius: 10, marginBottom: 10 }, orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, orderId: { fontWeight: '700' }, badge: { color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 11, overflow: 'hidden' }, pending: { backgroundColor: '#f39c12' }, completed: { backgroundColor: '#2e7d32' }, amount: { fontSize: 16, marginTop: 10, fontWeight: '600' }, address: { color: '#4976aa', marginTop: 6, fontSize: 12 }, empty: { alignItems: 'center', paddingTop: 50 }, emptyText: { fontSize: 16, marginBottom: 6 },
});
