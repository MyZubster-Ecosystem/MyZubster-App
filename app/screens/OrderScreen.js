import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { getOrderPaymentStatus } from '../services/orderService';

const xmr = value => Number(value || 0).toFixed(8);

export default function OrderScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try { setOrder(await getOrderPaymentStatus(orderId)); setError(null); }
    catch (err) { setError(err.response?.data?.error || err.message || 'Ordine non disponibile.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [orderId]);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (order?.status === 'pending') load(true);
    }, 15000);
    return () => clearInterval(timer);
  }, [load, order?.status]);

  const copy = async address => { await Clipboard.setStringAsync(address); Alert.alert('Copiato', 'Indirizzo Monero copiato.'); };
  const isPending = order?.status === 'pending' || order?.status === 'confirmed';

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>Caricamento ordine…</Text></View>;
  if (error || !order) return <View style={styles.center}><Text style={styles.error}>{error || 'Ordine non trovato'}</Text><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity></View>;

  return <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
    <Text style={styles.title}>Ordine #{order.id || order._id}</Text>
    <View style={styles.card}><Text style={styles.label}>Stato</Text><Text style={[styles.status, order.status === 'completed' ? styles.completed : styles.pending]}>{String(order.status || 'pending').toUpperCase()}</Text><Text style={styles.label}>Importo</Text><Text style={styles.value}>{order.amount} {order.currency}</Text>{order.moneroAmount != null && <><Text style={styles.label}>Da pagare in XMR</Text><Text style={styles.value}>{xmr(order.moneroAmount)} XMR</Text></>}</View>
    {order.moneroAddress && <View style={styles.card}><Text style={styles.label}>Indirizzo di pagamento</Text><View style={styles.qr}><QRCode value={`monero:${order.moneroAddress}${order.moneroAmount ? `?tx_amount=${xmr(order.moneroAmount)}` : ''}`} size={180} /></View><TouchableOpacity onPress={() => copy(order.moneroAddress)}><Text selectable style={styles.address}>{order.moneroAddress}</Text><Text style={styles.copy}>Tocca per copiare</Text></TouchableOpacity>{isPending && <Text style={styles.hint}>Il monitor Gateway aggiorna lo stato dopo le conferme Monero.</Text>}</View>}
    <View style={styles.card}><Text style={styles.label}>Conferme</Text><Text style={styles.value}>{order.confirmations || 0}</Text>{order.amountReceived != null && <><Text style={styles.label}>Ricevuto</Text><Text style={styles.value}>{xmr(order.amountReceived)} XMR</Text></>}</View>
    {order.status === 'completed' && <View style={styles.success}><Text style={styles.successText}>Pagamento confermato</Text></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }, back: { color: '#1976D2', fontSize: 16, marginBottom: 18 }, title: { fontSize: 24, fontWeight: '700', marginBottom: 16 }, card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 }, label: { color: '#666', fontWeight: '600', marginTop: 8 }, value: { fontSize: 18, marginTop: 4 }, status: { alignSelf: 'flex-start', color: 'white', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5, marginTop: 6, fontWeight: '700', fontSize: 12 }, pending: { backgroundColor: '#f39c12' }, completed: { backgroundColor: '#2e7d32' }, qr: { alignItems: 'center', margin: 14 }, address: { textAlign: 'center', color: '#1e5aa8', fontSize: 12 }, copy: { textAlign: 'center', color: '#777', marginTop: 6 }, hint: { color: '#777', marginTop: 14, lineHeight: 20 }, success: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 16 }, successText: { color: '#2e7d32', fontWeight: '700', textAlign: 'center' }, error: { color: '#c62828', marginBottom: 14 },
});
