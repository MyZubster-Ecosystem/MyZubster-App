import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { connectOrbot, disconnectOrbot, getOrbotStatus, verifyAnonymousIp } from '../services/orbotService';
import { getGatewayTransportStatus, getPrivacyPreferences, setUseTorProxy } from '../services/privacyService';

export default function PrivacyScreen({ navigation }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ipResult, setIpResult] = useState(null);
  const [torPreference, setTorPreference] = useState(false);
  const [transport, setTransport] = useState(getGatewayTransportStatus());

  const refresh = useCallback(async () => {
    const [nextStatus, prefs] = await Promise.all([getOrbotStatus(), getPrivacyPreferences()]);
    setStatus(nextStatus);
    setTorPreference(Boolean(prefs.useTorProxy));
    setTransport(getGatewayTransportStatus());
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async () => {
    setBusy(true);
    try {
      setStatus(await (status?.requested ? disconnectOrbot() : connectOrbot()));
    } catch (error) {
      Alert.alert('Orbot', error.message || 'Impossibile comunicare con Orbot.');
    } finally { setBusy(false); }
  };

  const testIp = async () => {
    setBusy(true);
    try { setIpResult(await verifyAnonymousIp()); }
    catch (error) { Alert.alert('Test Tor', error.message || 'Test non riuscito.'); }
    finally { setBusy(false); }
  };

  const toggleProxy = async () => {
    setBusy(true);
    try {
      const next = await setUseTorProxy(!torPreference);
      setTorPreference(Boolean(next.useTorProxy));
      setTransport(next.transport);
    } catch (error) {
      Alert.alert('Proxy Tor', error.message || 'Impossibile salvare la preferenza.');
    } finally { setBusy(false); }
  };

  if (!status) return <View style={styles.center}><ActivityIndicator size="large" color="#7B2FBE" /></View>;

  return <View style={styles.container}>
    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
    <Text style={styles.title}>Privacy e Tor</Text>
    <View style={styles.card}>
      <Text style={styles.row}>Orbot: <Text style={status.installed ? styles.ok : styles.warn}>{status.installed ? 'installato' : 'non installato'}</Text></Text>
      <Text style={styles.row}>Richiesta connessione: {status.requested ? 'attiva' : 'non attiva'}</Text>
      <Text style={styles.row}>Traffico API via SOCKS5: <Text style={status.trafficTunneled ? styles.ok : styles.warn}>{status.trafficTunneled ? 'attivo' : 'non disponibile'}</Text></Text>
      <Text style={styles.row}>Gateway: {transport.mode === 'tor' ? 'Tor opt-in' : 'HTTPS diretto'}</Text>
      <Text style={styles.row}>Endpoint Tor attendibili: {transport.trustedEndpointCount}</Text>
      {!status.trafficTunneled && <Text style={styles.note}>L’avvio di Orbot da solo non instrada i socket React Native. Serve una development build con un modulo proxy nativo; l’app non dichiara anonimato finché non è presente.</Text>}
    </View>
    <TouchableOpacity style={styles.button} onPress={toggle} disabled={busy}><Text style={styles.buttonText}>{status.requested ? 'Disconnetti Orbot' : status.installed ? 'Avvia Orbot' : 'Installa Orbot'}</Text></TouchableOpacity>
    {!status.installed && <TouchableOpacity style={styles.link} onPress={() => Linking.openURL('https://guardianproject.info/apps/org.torproject.android/')}><Text style={styles.linkText}>Apri pagina Orbot</Text></TouchableOpacity>}
    <TouchableOpacity style={[styles.button, styles.secondary]} onPress={toggleProxy} disabled={busy}><Text style={styles.buttonText}>{torPreference ? 'Disattiva proxy Tor per API' : 'Attiva proxy Tor per API'}</Text></TouchableOpacity>
    <TouchableOpacity style={styles.test} onPress={testIp} disabled={busy}><Text>Verifica IP Tor</Text></TouchableOpacity>
    {ipResult && <Text style={[styles.result, ipResult.isTor ? styles.ok : styles.warn]}>{ipResult.isTor ? 'IP riconosciuto come Tor' : 'IP non riconosciuto come Tor'}{ipResult.ip ? ` (${ipResult.ip})` : ''}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { color: '#1976D2', fontSize: 16, marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 18 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
  row: { fontSize: 16, marginBottom: 12 },
  note: { color: '#8a5a00', backgroundColor: '#fff8e1', padding: 12, borderRadius: 8, lineHeight: 20 },
  ok: { color: '#2e7d32', fontWeight: '700' },
  warn: { color: '#b26a00', fontWeight: '700' },
  button: { backgroundColor: '#7B2FBE', borderRadius: 8, padding: 15, alignItems: 'center' },
  secondary: { backgroundColor: '#4A148C', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: '700' },
  link: { padding: 15, alignItems: 'center' },
  linkText: { color: '#1976D2' },
  test: { borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  result: { textAlign: 'center', marginTop: 16, fontWeight: '700' },
});
