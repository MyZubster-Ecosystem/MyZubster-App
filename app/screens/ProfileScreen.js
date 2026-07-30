import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { getProfileReputation } from '../services/profileService';

export default function ProfileScreen({ navigation }) {
  const { user, saveProfile, refreshProfile } = useContext(AuthContext);
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || user?.moneroAddress || '');
  const [reputation, setReputation] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getProfileReputation(user.id).then(setReputation).catch(() => setReputation(null));
  }, [user?.id]);

  const save = async () => {
    setSaving(true);
    try { await saveProfile({ name: name.trim(), username: username.trim(), walletAddress: walletAddress.trim() }); Alert.alert('Profilo', 'Profilo aggiornato.'); }
    catch (error) { Alert.alert('Profilo', error.response?.data?.error || error.message || 'Salvataggio non riuscito.'); }
    finally { setSaving(false); }
  };

  const refresh = async () => { try { const next = await refreshProfile(); setName(next.name || ''); setUsername(next.username || ''); setWalletAddress(next.walletAddress || next.moneroAddress || ''); } catch (error) { Alert.alert('Profilo', error.message); } };

  return <ScrollView contentContainerStyle={styles.container}>
    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
    <Text style={styles.title}>Profilo</Text>
    <View style={styles.card}><Text style={styles.label}>Email</Text><Text style={styles.value}>{user?.email || 'Account anonimo'}</Text><Text style={styles.label}>Wallet XMR</Text><Text selectable style={styles.address}>{walletAddress || '—'}</Text></View>
    <TextInput style={styles.input} placeholder="Nome" value={name} onChangeText={setName} />
    <TextInput style={styles.input} placeholder="Nickname" value={username} onChangeText={setUsername} autoCapitalize="none" />
    <TextInput style={styles.input} placeholder="Indirizzo Monero pubblico" value={walletAddress} onChangeText={setWalletAddress} autoCapitalize="none" />
    <TouchableOpacity style={styles.primary} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Salva profilo</Text>}</TouchableOpacity>
    <TouchableOpacity style={styles.secondary} onPress={refresh}><Text style={styles.secondaryText}>Aggiorna dal server</Text></TouchableOpacity>
    <View style={styles.card}><Text style={styles.section}>Reputazione</Text><Text style={styles.rating}>{Number(reputation?.averageRating || user?.rating || 0).toFixed(1)} ★</Text><Text style={styles.muted}>{reputation?.totalReviews || 0} recensioni</Text><TouchableOpacity onPress={() => navigation.navigate('Reviews', { targetId: user?.id, title: 'La mia reputazione' })}><Text style={styles.link}>Vedi recensioni</Text></TouchableOpacity></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  back: { color: '#1976D2', fontSize: 16, marginBottom: 12 }, title: { fontSize: 28, fontWeight: '700', marginBottom: 18 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 14 }, label: { color: '#666', fontWeight: '600', marginTop: 8 }, value: { fontSize: 16, marginTop: 4 }, address: { color: '#1e5aa8', fontSize: 12, marginTop: 4 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 13, marginBottom: 12 },
  primary: { backgroundColor: '#4CAF50', borderRadius: 8, padding: 15, alignItems: 'center' }, primaryText: { color: 'white', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#4CAF50', borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 10 }, secondaryText: { color: '#2e7d32', fontWeight: '700' },
  section: { fontSize: 18, fontWeight: '700' }, rating: { fontSize: 30, fontWeight: '700', color: '#f39c12', marginTop: 8 }, muted: { color: '#777', marginTop: 4 }, link: { color: '#1976D2', marginTop: 12, fontWeight: '700' },
});
