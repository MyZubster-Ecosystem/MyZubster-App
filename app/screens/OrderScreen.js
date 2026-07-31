import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { usePaymentCountdown } from '../hooks/usePaymentCountdown';
import { cancelOrder, getOrderPaymentStatus } from '../services/orderService';
import { API_URL } from '../services/api';
import { createOrderSocket } from '../services/orderSocket';

const STATUS_LABELS = {
  pending: 'In attesa di pagamento',
  confirmed: 'Confermato, in attesa di accredito',
  completed: 'Completato',
  cancelled: 'Annullato',
};

const xmr = value => Number(value || 0).toFixed(8);

export default function OrderScreen({ route, navigation }) {
  const { orderId, expiresAt } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await getOrderPaymentStatus(orderId);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Ordine non disponibile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  const handleExpire = useCallback(() => {
    setOrder(prev => prev ? { ...prev, status: prev.status === 'pending' ? 'expired' : prev.status } : prev);
  }, []);

  const { remaining, formatted } = usePaymentCountdown({
    expiresAt: expiresAt || order?.expiresAt,
    onExpire: handleExpire,
  });

  useEffect(() => {
    load();
    let socketReady = false;
    try {
      wsRef.current = createOrderSocket({
        apiUrl: API_URL,
        orderId,
        onMessage: (data) => {
          if (data && data.status) {
            socketReady = true;
            setOrder(prev => {
              if (!prev) return prev;
              return { ...prev, ...data };
            });
          }
        },
        onError: () => {
          // fallback to polling
        },
        onClose: () => {
          // fallback to polling
        },
      });
    } catch {
      // ignore WS setup errors, fallback below
    }

    const timer = setInterval(() => {
      if (!socketReady) load(true);
    }, 15000);

    return () => {
      if (wsRef.current) wsRef.current.close();
      clearInterval(timer);
    };
  }, [API_URL, load, orderId]);

  const copy = async text => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiato', 'Indirizzo Monero copiato.');
  };

  const copyAmount = async () => {
    if (order?.moneroAmount == null) return;
    await Clipboard.setStringAsync(String(xmr(order.moneroAmount)));
    Alert.alert('Copiato', 'Importo XMR copiato.');
  };

  const handleCancel = async () => {
    try {
      const updated = await cancelOrder(orderId);
      setOrder(prev => ({ ...prev, ...updated }));
      Alert.alert('Annullato', "L'ordine è stato annullato.");
    } catch (err) {
      Alert.alert('Errore', err.response?.data?.error || err.message || 'Impossibile annullare l\'ordine.');
    }
  };

  const isPending = order?.status === 'pending' || order?.status === 'confirmed';
  const statusLabel = STATUS_LABELS[order?.status] || String(order?.status || 'pending').toUpperCase();

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>Caricamento ordine…</Text></View>;
  if (error || !order) return <View style={styles.center}><Text style={styles.error}>{error || 'Ordine non trovato'}</Text><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity></View>;

  return <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
    <Text style={styles.title}>Ordine #{order.id || order._id}</Text>

    {formatted && <View style={styles.card}><Text style={styles.label}>Tempo rimanente per il pagamento</Text><Text style={styles.countdown}>{formatted}</Text><Text style={styles.hint}>La finestra di pagamento scade al termine del conto alla rovescia.</Text></View>}

    <View style={styles.card}>
      <Text style={styles.label}>Stato</Text>
      <Text style={[styles.status, order.status === 'completed' ? styles.completed : order.status === 'cancelled' ? styles.cancelled : styles.pending]}>{statusLabel}</Text>
      <Text style={styles.statusDescription}>{STATUS_LABELS[order.status] || ''}</Text>
      <Text style={styles.label}>Importo</Text>
      <Text style={styles.value}>{order.amount} {order.currency}</Text>
      {order.moneroAmount != null && <><Text style={styles.label}>Da pagare in XMR</Text><Text style={styles.value}>{xmr(order.moneroAmount)} XMR</Text><TouchableOpacity style={styles.copyButton} onPress={copyAmount}><Text style={styles.copyButtonText}>Copia importo XMR</Text></TouchableOpacity></>}
    </View>

    {order.moneroAddress && <View style={styles.card}>
      <Text style={styles.label}>Indirizzo di pagamento</Text>
      <View style={styles.qr}><QRCode value={`monero:${order.moneroAddress}${order.moneroAmount ? `?tx_amount=${xmr(order.moneroAmount)}` : ''}`} size={180} /></View>
      <TouchableOpacity onPress={() => copy(order.moneroAddress)}><Text selectable style={styles.address}>{order.moneroAddress}</Text><Text style={styles.copy}>Tocca per copiare</Text></TouchableOpacity>
      {isPending && <Text style={styles.hint}>Il monitor Gateway aggiorna lo stato dopo le conferme Monero.</Text>}
    </View>}

    <View style={styles.card}>
      <Text style={styles.label}>Conferme</Text>
      <Text style={styles.value}>{order.confirmations || 0}</Text>
      {order.amountReceived != null && <><Text style={styles.label}>Ricevuto</Text><Text style={styles.value}>{xmr(order.amountReceived)} XMR</Text></>}
    </View>

    {order.status === 'pending' && <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}><Text style={styles.cancelButtonText}>Annulla ordine</Text></TouchableOpacity>}

    {order.status === 'completed' && <View style={styles.success}><Text style={styles.successText}>Pagamento confermato</Text></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  back: { color: '#1976D2', fontSize: 16, marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { color: '#666', fontWeight: '600', marginTop: 8 },
  value: { fontSize: 18, marginTop: 4 },
  status: { alignSelf: 'flex-start', color: 'white', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5, marginTop: 6, fontWeight: '700', fontSize: 12 },
  pending: { backgroundColor: '#f39c12' },
  completed: { backgroundColor: '#2e7d32' },
  cancelled: { backgroundColor: '#c62828' },
  statusDescription: { color: '#555', marginTop: 6 },
  countdown: { fontSize: 22, fontWeight: '700', marginTop: 6 },
  qr: { alignItems: 'center', margin: 14 },
  address: { textAlign: 'center', color: '#1e5aa8', fontSize: 12 },
  copy: { textAlign: 'center', color: '#777', marginTop: 6 },
  copyButton: { marginTop: 10, backgroundColor: '#e3f2fd', padding: 10, borderRadius: 8, alignItems: 'center' },
  copyButtonText: { color: '#1565c0', fontWeight: '700' },
  hint: { color: '#777', marginTop: 14, lineHeight: 20 },
  success: { backgroundColor: '#e8f5e9', borderRadius: 10, padding: 16 },
  successText: { color: '#2e7d32', fontWeight: '700', textAlign: 'center' },
  error: { color: '#c62828', marginBottom: 14 },
  cancelButton: { backgroundColor: '#c62828', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
