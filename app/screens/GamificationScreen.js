import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  GAMIFICATION_ACTION_POINTS,
  GAMIFICATION_BADGES,
  LEADERBOARD_PERIODS,
  claimTopContributorBonus,
  getGamificationProfile,
  getLeaderboard,
  isGamificationEndpointError,
} from '../services/gamificationService';

const periodLabels = { weekly: 'Settimana', monthly: 'Mese', total: 'Totale' };

export default function GamificationScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState({ period: 'weekly', entries: [] });
  const [period, setPeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(async (isRefresh = false, nextPeriod = period) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [nextProfile, nextLeaderboard] = await Promise.all([
        getGamificationProfile(),
        getLeaderboard(nextPeriod),
      ]);
      setProfile(nextProfile);
      setLeaderboard(nextLeaderboard);
    } catch (error) {
      const message = isGamificationEndpointError(error)
        ? 'Gli endpoint gamification non sono ancora disponibili sul gateway.'
        : (error.response?.data?.error || error.message || 'Impossibile caricare classifiche e badge.');
      Alert.alert('Gamification', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const earnedBadgeIds = useMemo(() => new Set((profile?.badges || []).map(badge => badge.id || badge)), [profile]);
  const handlePeriod = (nextPeriod) => {
    setPeriod(nextPeriod);
    load(false, nextPeriod);
  };

  const claimBonus = async () => {
    setClaiming(true);
    try {
      await claimTopContributorBonus(period);
      Alert.alert('Bonus', 'Bonus top contributor richiesto.');
      await load(true, period);
    } catch (error) {
      Alert.alert('Bonus', error.response?.data?.error || error.message || 'Bonus non disponibile.');
    } finally {
      setClaiming(false);
    }
  };

  const renderLeaderboard = ({ item }) => (
    <View style={styles.rankRow}>
      <Text style={styles.rank}>#{item.rank}</Text>
      <View style={styles.rankInfo}>
        <Text style={styles.rankName}>{item.name}</Text>
        <Text style={styles.muted}>{item.reports} segnalazioni - {item.verifications} verifiche</Text>
      </View>
      <Text style={styles.rankPoints}>{item.points} pt</Text>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>Caricamento gamification...</Text></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true, period)} />}
    >
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>Indietro</Text></TouchableOpacity>
        <Text style={styles.title}>Gamification</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.caption}>Punteggio totale</Text>
        <Text style={styles.points}>{profile?.totalPoints || 0} pt</Text>
        <Text style={styles.heroMeta}>Rank #{profile?.rank || '-'} - {profile?.reports || 0} segnalazioni - {profile?.verifications || 0} verifiche</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Azioni premiate</Text>
        {Object.entries(GAMIFICATION_ACTION_POINTS).map(([action, points]) => (
          <View key={action} style={styles.actionRow}>
            <Text style={styles.actionName}>{action.replace(/_/g, ' ')}</Text>
            <Text style={styles.actionPoints}>+{points} pt</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Badge e achievement</Text>
        <View style={styles.badges}>
          {GAMIFICATION_BADGES.map(badge => {
            const earned = earnedBadgeIds.has(badge.id);
            return (
              <View key={badge.id} style={[styles.badge, earned && styles.badgeEarned]}>
                <Text style={[styles.badgeText, earned && styles.badgeTextEarned]}>{badge.label}</Text>
                <Text style={[styles.badgeThreshold, earned && styles.badgeTextEarned]}>{badge.threshold} pt</Text>
              </View>
            );
          })}
        </View>
        {(profile?.achievements || []).map(achievement => (
          <Text key={achievement.id || achievement.label || achievement} style={styles.achievement}>Award: {achievement.label || achievement}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Classifica</Text>
          <TouchableOpacity style={styles.claimButton} onPress={claimBonus} disabled={claiming}>
            {claiming ? <ActivityIndicator color="white" /> : <Text style={styles.claimText}>Bonus</Text>}
          </TouchableOpacity>
        </View>
        <View style={styles.periods}>
          {LEADERBOARD_PERIODS.map(option => (
            <TouchableOpacity key={option} style={[styles.periodButton, period === option && styles.periodActive]} onPress={() => handlePeriod(option)}>
              <Text style={[styles.periodText, period === option && styles.periodTextActive]}>{periodLabels[option]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <FlatList
          scrollEnabled={false}
          data={leaderboard.entries}
          keyExtractor={(item, index) => String(item.userId || `${item.rank}-${index}`)}
          renderItem={renderLeaderboard}
          ListEmptyComponent={<Text style={styles.muted}>Nessun contributor in classifica.</Text>}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  topRow: { marginBottom: 14 },
  back: { color: '#1976D2', fontSize: 16, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800' },
  hero: { backgroundColor: '#17351f', borderRadius: 12, padding: 18, marginBottom: 12 },
  caption: { color: '#b8d9bf' },
  points: { color: 'white', fontSize: 34, fontWeight: '800', marginVertical: 6 },
  heroMeta: { color: '#d8efd8' },
  card: { backgroundColor: 'white', borderRadius: 10, padding: 14, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#eee' },
  actionName: { textTransform: 'capitalize', color: '#333' },
  actionPoints: { color: '#2e7d32', fontWeight: '800' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { borderWidth: 1, borderColor: '#d6d6d6', borderRadius: 8, padding: 10, minWidth: '45%' },
  badgeEarned: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  badgeText: { fontWeight: '800', color: '#333' },
  badgeThreshold: { color: '#777', marginTop: 4, fontSize: 12 },
  badgeTextEarned: { color: 'white' },
  achievement: { marginTop: 8, color: '#2e7d32', fontWeight: '700' },
  periods: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  periodButton: { flex: 1, borderWidth: 1, borderColor: '#d6d6d6', borderRadius: 8, padding: 9, alignItems: 'center' },
  periodActive: { backgroundColor: '#263238', borderColor: '#263238' },
  periodText: { color: '#333', fontWeight: '700' },
  periodTextActive: { color: 'white' },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rank: { width: 42, fontWeight: '800', color: '#1976D2' },
  rankInfo: { flex: 1 },
  rankName: { fontWeight: '800' },
  rankPoints: { color: '#2e7d32', fontWeight: '800' },
  muted: { color: '#777' },
  claimButton: { minWidth: 76, backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', marginBottom: 10 },
  claimText: { color: 'white', fontWeight: '800' },
});
