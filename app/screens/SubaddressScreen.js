import React, { useEffect, useState } from 'react';
import {
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
import { createReceiveAddress, listAddresses } from '../services/walletService';

function isValidMoneroAddress(value) {
  return /^[48][1-9A-HJ-NP-Za-km-z]{90,}$/.test(String(value || '').trim());
}

export default function SubaddressScreen({ navigation, route }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [labelText, setLabelText] = useState('');

  const initialAddress = route?.params?.address || '';

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const list = await listAddresses();
      const normalized = (list || []).map(item => ({
        address: item.address || item.moneroAddress || '',
        label: item.label || '',
        primary: item.primary || item.main || false,
      }));
      setAddresses(normalized);
    } catch (error) {
      Alert.alert('Indirizzi', error.response?.data?.error || error.message || 'Impossibile caricare gli indirizzi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (initialAddress && isValidMoneroAddress(initialAddress) && !addresses.some(a => a.address === initialAddress)) {
      setAddresses(prev => [{ address: initialAddress, label: 'Principale', primary: true }, ...prev]);
    }
  }, [initialAddress]);

  const generateAddress = async () => {
    setBusy(true);
    try {
      const data = await createReceiveAddress(`mobile-${Date.now()}`);
      const newAddress = data.address || data.moneroAddress || '';
      if (!newAddress) throw new Error('Indirizzo non restituito dal gateway.');
      setAddresses(prev => [...prev, { address: newAddress, label: data.label || '', primary: false }]);
      Alert.alert('Indirizzo', 'Nuovo indirizzo generato.');
    } catch (error) {
      Alert.alert('Indirizzi', error.response?.data?.error || error.message || 'Impossibile generare un indirizzo.');
    } finally {
      setBusy(false);
    }
  };

  const copyAddress = async address => {
    await Clipboard.setStringAsync(address);
    Alert.alert('Copiato', 'Indirizzo Monero copiato negli appunti.');
  };

  const startEdit = item => {
    setEditing(item.address);
    setLabelText(item.label || '');
  };

  const saveLabel = () => {
    setAddresses(prev => prev.map(a => a.address === editing ? { ...a, label: labelText.trim() } : a));
    setEditing(null);
    setLabelText('');
  };

  const removeAddress = address => {
    setAddresses(prev => prev.filter(a => a.address !== address));
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text selectable style={styles.address}>{item.address}</Text>
        <Text style={styles.label}>{item.label || 'Senza etichetta'}</Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity style={styles.iconButton} onPress={() => copyAddress(item.address)}><Text style={styles.iconText}>Copia</Text></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => startEdit(item)}><Text style={styles.iconText}>Etichetta</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.iconButton, styles.danger]} onPress={() => removeAddress(item.address)}><Text style={styles.iconText}>Rimuovi</Text></TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><Text>Caricamento indirizzi…</Text></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
        <Text style={styles.title}>Indirizzi</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Subaddress</Text>
        {addresses.length === 0 ? <Text style={styles.muted}>Nessun indirizzo disponibile.</Text> : (
          <FlatList scrollEnabled={false} data={addresses} keyExtractor={(item, index) => item.address || String(index)} renderItem={renderItem} />
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={generateAddress} disabled={busy}>
          <Text style={styles.buttonText}>{busy ? 'Generazione…' : 'Genera indirizzo'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={!!editing} animationType="fade" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Etichetta indirizzo</Text>
            <TextInput value={labelText} onChangeText={setLabelText} placeholder="Es. Negozio, Acquisti" style={styles.input} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setEditing(null)}><Text style={styles.secondaryText}>Annulla</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={saveLabel}><Text style={styles.buttonText}>Salva</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { color: '#1976D2', fontSize: 16, marginRight: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 10 },
  address: { color: '#1e5aa8', fontSize: 12, flexShrink: 1 },
  label: { color: '#555', fontSize: 13, marginTop: 4 },
  rowActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  iconButton: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#4CAF50' },
  iconText: { color: '#277d35', fontWeight: '700', fontSize: 12 },
  danger: { borderColor: '#c62828' },
  muted: { color: '#777' },
  primaryButton: { flex: 1, backgroundColor: '#4CAF50', padding: 13, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  buttonText: { color: 'white', fontWeight: '700' },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
  secondaryText: { color: '#277d35', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: 'white', borderRadius: 16, padding: 20 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 10 },
});
