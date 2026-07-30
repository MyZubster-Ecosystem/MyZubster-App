import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { createReceiveAddress, getWallet, getWalletTransactions, isWalletEndpointError, sendPayment } from '../services/walletService';

const formatXmr = value => Number(value || 0).toFixed(8);
const parseAddress = value => String(value || '').replace(/^monero:/i, '').split(/[?;]/)[0];

export default function WalletScreen({ navigation }) {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receiveAddress, setReceiveAddress] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendBusy, setSendBusy] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [summary, history] = await Promise.all([getWallet(), getWalletTransactions()]);
      setWallet(summary);
      setTransactions(history);
      if (!receiveAddress && summary?.address) setReceiveAddress(summary.address);
    } catch (error) {
      if (isWalletEndpointError(error)) {
        Alert.alert('Wallet non configurato', 'Il Gateway deve esporre /wallet, /wallet/address e /wallet/transfer prima di usare il wallet mobile.');
      } else {
        Alert.alert('Wallet', error.response?.data?.error || error.message || 'Impossibile caricare il wallet.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [receiveAddress]);

  useEffect(() => { load(); }, [load]);

  const requestReceiveAddress = async () => {
    try {
      const data = await createReceiveAddress(`mobile-${Date.now()}`);
      setReceiveAddress(data.address || data.moneroAddress || '');
    } catch (error) {
      Alert.alert('Wallet', error.response?.data?.error || error.message || 'Impossibile generare un indirizzo.');
    }
  };

  const copyAddress = async () => {
    if (!receiveAddress) return;
    await Clipboard.setStringAsync(receiveAddress);
    Alert.alert('Copiato', 'Indirizzo Monero copiato negli appunti.');
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return Alert.alert('Fotocamera', 'È necessario consentire l’accesso alla fotocamera per scansionare un indirizzo.');
    }
    setShowScanner(true);
  };

  const submitSend = async () => {
    const amount = Number(sendAmount);
    if (!/^[48]/.test(sendAddress.trim()) || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Pagamento', 'Inserisci un indirizzo Monero e un importo XMR valido.');
      return;
    }
    setSendBusy(true);
    try {
      await sendPayment({ address: sendAddress.trim(), amount });
      setShowSend(false);
      setSendAddress('');
      setSendAmount('');
      await load(true);
      Alert.alert('Pagamento inviato', 'La transazione è stata consegnata al Gateway.');
    } catch (error) {
      Alert.alert('Pagamento', error.response?.data?.error || error.message || 'Invio non riuscito.');
    } finally {
      setSendBusy(false);
    }
  };

  const balance = wallet?.unlockedBalance ?? wallet?.unlocked_balance ?? wallet?.balance ?? 0;
  const address = receiveAddress || wallet?.address || wallet?.moneroAddress || '';

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>Caricamento wallet…</Text></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
        <Text style={styles.title}>Wallet Monero</Text>
      </View>
      <View style={styles.balanceCard}>
        <Text style={styles.caption}>Saldo disponibile</Text>
        <Text style={styles.balance}>{formatXmr(balance)} XMR</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setShowSend(true)}><Text style={styles.buttonText}>Invia</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={requestReceiveAddress}><Text style={styles.secondaryText}>Nuovo indirizzo</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Ricevi</Text>
        {address ? <>
          <View style={styles.qrWrap}><QRCode value={`monero:${address}`} size={180} backgroundColor="white" /></View>
          <Text selectable style={styles.address}>{address}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={copyAddress}><Text style={styles.secondaryText}>Copia</Text></TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={openScanner}><Text style={styles.secondaryText}>Scansiona</Text></TouchableOpacity>
          </View>
        </> : <Text style={styles.muted}>Nessun indirizzo disponibile.</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Transazioni</Text>
        {transactions.length === 0 ? <Text style={styles.muted}>Nessuna transazione.</Text> : <FlatList
          scrollEnabled={false}
          data={transactions}
          keyExtractor={(item, index) => String(item.txid || item.txHash || item.id || index)}
          renderItem={({ item }) => <View style={styles.txRow}>
            <View><Text style={styles.txType}>{item.type || (item.incoming ? 'Ricevuta' : 'Inviata')}</Text><Text style={styles.muted}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : item.txid || item.txHash || '—'}</Text></View>
            <Text style={item.type === 'outgoing' ? styles.outgoing : styles.incoming}>{item.type === 'outgoing' ? '-' : '+'}{formatXmr(item.amount)} XMR</Text>
          </View>}
        />} 
      </View>

      <Modal visible={showSend} animationType="slide" onRequestClose={() => setShowSend(false)}>
        <ScrollView contentContainerStyle={styles.modal}>
          <Text style={styles.title}>Invia XMR</Text>
          <TextInput value={sendAddress} onChangeText={setSendAddress} placeholder="Indirizzo Monero" autoCapitalize="none" style={styles.input} />
          <TextInput value={sendAmount} onChangeText={setSendAmount} placeholder="Importo XMR" keyboardType="decimal-pad" style={styles.input} />
          <TouchableOpacity style={styles.primaryButton} onPress={submitSend} disabled={sendBusy}>{sendBusy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Conferma invio</Text>}</TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => setShowSend(false)}><Text>Annulla</Text></TouchableOpacity>
        </ScrollView>
      </Modal>

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scanner}><CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => { setSendAddress(parseAddress(data)); setShowScanner(false); setShowSend(true); }} /><TouchableOpacity style={styles.closeScanner} onPress={() => setShowScanner(false)}><Text style={styles.buttonText}>Chiudi</Text></TouchableOpacity></View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  modal: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { color: '#1976D2', fontSize: 16, marginRight: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  balanceCard: { backgroundColor: '#17351f', padding: 20, borderRadius: 14, marginBottom: 14 },
  caption: { color: '#b8d9bf' },
  balance: { color: 'white', fontSize: 30, fontWeight: '700', marginVertical: 8 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  qrWrap: { alignItems: 'center', padding: 10, marginBottom: 8 },
  address: { color: '#1e5aa8', fontSize: 12, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryButton: { flex: 1, backgroundColor: '#4CAF50', padding: 13, borderRadius: 8, alignItems: 'center' },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '700' },
  secondaryText: { color: '#277d35', fontWeight: '700' },
  muted: { color: '#777' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  txType: { fontWeight: '600' },
  incoming: { color: '#2e7d32', fontWeight: '700' },
  outgoing: { color: '#c62828', fontWeight: '700' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, marginBottom: 12 },
  cancel: { alignItems: 'center', padding: 16 },
  scanner: { flex: 1, backgroundColor: 'black' },
  closeScanner: { position: 'absolute', bottom: 36, left: 20, right: 20, backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center' },
});
