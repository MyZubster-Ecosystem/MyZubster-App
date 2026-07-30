import React, { useContext, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AuthContext } from '../context/AuthContext';
import { requestMoneroChallenge } from '../services/authService';

export default function AnonymousLoginScreen({ navigation }) {
  const { loginAnonymous } = useContext(AuthContext);
  const [walletAddress, setWalletAddress] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);

  const getChallenge = async () => {
    if (!walletAddress.trim()) return Alert.alert('Wallet', 'Inserisci un indirizzo Monero.');
    setLoading(true);
    try {
      const result = await requestMoneroChallenge(walletAddress.trim());
      setMessage(result.message || result.challenge || '');
      if (!result.message && !result.challenge) throw new Error('Il Gateway non ha restituito una challenge.');
    } catch (error) {
      Alert.alert('Challenge non disponibile', error.response?.data?.error || error.message);
    } finally { setLoading(false); }
  };

  const copyChallenge = async () => {
    if (message) { await Clipboard.setStringAsync(message); Alert.alert('Copiato', 'Firma il messaggio nel tuo wallet Monero e incolla la firma qui.'); }
  };

  const submit = async () => {
    if (!walletAddress.trim() || !nickname.trim() || !message.trim() || !signature.trim()) {
      return Alert.alert('Accesso anonimo', 'Inserisci indirizzo, nickname, challenge e firma.');
    }
    setLoading(true);
    try {
      await loginAnonymous({ walletAddress: walletAddress.trim(), nickname: nickname.trim(), message, signature: signature.trim() });
    } catch (error) {
      Alert.alert('Accesso anonimo fallito', error.response?.data?.error || error.message || 'Firma non valida.');
    } finally { setLoading(false); }
  };

  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>🕶️ Accesso anonimo</Text>
    <Text style={styles.note}>Il wallet firma una challenge; la chiave privata non viene mai salvata nell’app.</Text>
    <TextInput style={styles.input} placeholder="Indirizzo Monero" value={walletAddress} onChangeText={setWalletAddress} autoCapitalize="none" />
    <TextInput style={styles.input} placeholder="Nickname pubblico" value={nickname} onChangeText={setNickname} />
    <TouchableOpacity style={styles.secondary} onPress={getChallenge} disabled={loading}><Text style={styles.secondaryText}>Genera challenge</Text></TouchableOpacity>
    <TextInput style={[styles.input, styles.multiline]} placeholder="Messaggio challenge" value={message} onChangeText={setMessage} multiline editable={!!message} />
    <TouchableOpacity style={styles.link} onPress={copyChallenge} disabled={!message}><Text style={styles.linkText}>Copia messaggio da firmare</Text></TouchableOpacity>
    <TextInput style={[styles.input, styles.multiline]} placeholder="Firma Monero (signature)" value={signature} onChangeText={setSignature} autoCapitalize="none" multiline />
    <TouchableOpacity style={styles.primary} onPress={submit} disabled={loading}>{loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Accedi senza email</Text>}</TouchableOpacity>
    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.linkText}>Indietro</Text></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  note: { color: '#666', lineHeight: 20, marginBottom: 18, textAlign: 'center' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 13, marginBottom: 12 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  primary: { backgroundColor: '#4CAF50', borderRadius: 8, padding: 15, alignItems: 'center', marginTop: 8 },
  primaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
  secondary: { borderWidth: 1, borderColor: '#4CAF50', borderRadius: 8, padding: 13, alignItems: 'center', marginBottom: 12 },
  secondaryText: { color: '#2e7d32', fontWeight: '700' },
  link: { alignItems: 'center', padding: 8 },
  linkText: { color: '#1976D2', textAlign: 'center', padding: 10 },
});
