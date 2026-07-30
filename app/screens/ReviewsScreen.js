import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createReview, getReviewStats, listReviews } from '../services/reviewService';

const stars = count => '★'.repeat(count) + '☆'.repeat(5 - count);

export default function ReviewsScreen({ route, navigation }) {
  const targetId = route.params?.targetId;
  const title = route.params?.title || 'Recensioni';
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [nextReviews, nextStats] = await Promise.all([listReviews(targetId), getReviewStats(targetId)]);
      setReviews(nextReviews); setStats(nextStats);
    } catch (error) { Alert.alert('Recensioni', error.response?.data?.error || error.message || 'Impossibile caricare le recensioni.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [targetId]);

  useEffect(() => { if (targetId) load(); }, [load, targetId]);

  const submit = async () => {
    if (!targetId || !comment.trim()) return Alert.alert('Recensione', 'Scrivi un commento prima di inviare.');
    setSaving(true);
    try { await createReview({ targetId, rating, comment }); setComment(''); await load(true); Alert.alert('Recensione', 'Recensione inviata.'); }
    catch (error) { Alert.alert('Recensione', error.response?.data?.error || error.message || 'Invio non riuscito.'); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  return <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
    <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
    <Text style={styles.title}>{title}</Text>
    <View style={styles.summary}><Text style={styles.rating}>{Number(stats?.averageRating || 0).toFixed(1)} ★</Text><Text style={styles.muted}>{stats?.totalReviews || reviews.length} recensioni</Text><View style={styles.distribution}>{Object.entries(stats?.ratingDistribution || {}).sort(([a], [b]) => Number(b) - Number(a)).map(([key, value]) => <Text key={key} style={styles.muted}>{key} ★: {value}</Text>)}</View></View>
    <View style={styles.form}><Text style={styles.section}>Lascia una recensione</Text><View style={styles.starRow}>{[1, 2, 3, 4, 5].map(value => <TouchableOpacity key={value} onPress={() => setRating(value)}><Text style={[styles.star, value <= rating && styles.starActive]}>★</Text></TouchableOpacity>)}</View><TextInput style={styles.input} placeholder="Commento" value={comment} onChangeText={setComment} multiline /><TouchableOpacity style={styles.primary} onPress={submit} disabled={saving}>{saving ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>Invia recensione</Text>}</TouchableOpacity></View>
    <Text style={styles.section}>Storico recensioni</Text>
    {reviews.length === 0 ? <Text style={styles.muted}>Nessuna recensione.</Text> : <FlatList scrollEnabled={false} data={reviews} keyExtractor={(item, index) => String(item.id || index)} renderItem={({ item }) => <View style={styles.review}><View style={styles.row}><Text style={styles.reviewer}>{item.reviewerName || item.reviewer?.name || 'Utente'}</Text><Text style={styles.stars}>{stars(Number(item.rating || 0))}</Text></View><Text style={styles.comment}>{item.comment || '—'}</Text><Text style={styles.muted}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</Text></View>} />}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, back: { color: '#1976D2', fontSize: 16, marginBottom: 12 }, title: { fontSize: 26, fontWeight: '700', marginBottom: 14 },
  summary: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 14 }, rating: { fontSize: 32, color: '#f39c12', fontWeight: '700' }, muted: { color: '#777', marginTop: 4 }, distribution: { marginTop: 10 }, form: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 }, section: { fontSize: 18, fontWeight: '700', marginBottom: 10 }, starRow: { flexDirection: 'row', marginBottom: 10 }, star: { fontSize: 32, color: '#ddd', marginRight: 4 }, starActive: { color: '#f39c12' }, input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, minHeight: 82, padding: 12, textAlignVertical: 'top', marginBottom: 12 }, primary: { backgroundColor: '#4CAF50', borderRadius: 8, padding: 14, alignItems: 'center' }, primaryText: { color: 'white', fontWeight: '700' }, review: { backgroundColor: 'white', borderRadius: 10, padding: 14, marginTop: 10 }, row: { flexDirection: 'row', justifyContent: 'space-between' }, reviewer: { fontWeight: '700' }, stars: { color: '#f39c12' }, comment: { marginTop: 8, lineHeight: 20 },
});
