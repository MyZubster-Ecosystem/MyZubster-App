import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { listNotifications, loadNotificationPreferences, markAllNotificationsRead, markNotificationRead, saveNotificationPreferences } from '../services/notificationService';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try { const [items, prefs] = await Promise.all([listNotifications(), loadNotificationPreferences()]); setNotifications(items); setPreferences(prefs); }
    catch (error) { Alert.alert('Notifiche', error.response?.data?.error || error.message || 'Impossibile caricare le notifiche.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async key => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    try { await saveNotificationPreferences(next); } catch (error) { Alert.alert('Notifiche', error.message); }
  };
  const markRead = async item => { try { await markNotificationRead(item.id || item._id); setNotifications(items => items.map(n => n.id === item.id || n._id === item._id ? { ...n, read: true } : n)); } catch (error) { Alert.alert('Notifiche', error.message); } };
  const markAll = async () => { try { await markAllNotificationsRead(); setNotifications(items => items.map(item => ({ ...item, read: true }))); } catch (error) { Alert.alert('Notifiche', error.message); } };

  if (loading || !preferences) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  return <View style={styles.container}>
    <View style={styles.header}><TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity><Text style={styles.title}>Notifiche</Text><TouchableOpacity onPress={markAll}><Text style={styles.link}>Segna tutte</Text></TouchableOpacity></View>
    <View style={styles.preferences}><Text style={styles.section}>Preferenze</Text>{[['orders', 'Ordini'], ['payments', 'Pagamenti'], ['messages', 'Messaggi'], ['reviews', 'Recensioni']].map(([key, label]) => <View style={styles.preference} key={key}><Text>{label}</Text><Switch value={preferences[key]} onValueChange={() => toggle(key)} /></View>)}</View>
    <FlatList data={notifications} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />} keyExtractor={(item, index) => String(item.id || item._id || index)} ListEmptyComponent={<Text style={styles.empty}>Nessuna notifica.</Text>} renderItem={({ item }) => <TouchableOpacity style={[styles.item, !item.read && styles.unread]} onPress={() => markRead(item)}><View style={styles.row}><Text style={styles.itemTitle}>{item.title || 'Aggiornamento'}</Text>{!item.read && <View style={styles.dot} />}</View><Text style={styles.message}>{item.message || item.body || ''}</Text><Text style={styles.muted}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text></TouchableOpacity>} />
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, back: { color: '#1976D2', fontSize: 16 }, title: { fontSize: 24, fontWeight: '700' }, link: { color: '#1976D2', fontWeight: '700' }, preferences: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12 }, section: { fontSize: 17, fontWeight: '700', marginBottom: 4 }, preference: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }, item: { backgroundColor: 'white', borderRadius: 10, padding: 14, marginBottom: 9 }, unread: { borderLeftWidth: 4, borderLeftColor: '#4CAF50' }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, itemTitle: { fontWeight: '700', flex: 1 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#4CAF50' }, message: { marginTop: 6, lineHeight: 20 }, muted: { color: '#777', marginTop: 6, fontSize: 12 }, empty: { textAlign: 'center', color: '#777', paddingTop: 30 },
});
