import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { getEarningsSummary, listDroneTasks, triggerAutoPayment, verifyTaskCompletion } from '../services/droneWalletService';

const formatXmr = value => Number(value || 0).toFixed(8);

export default function DroneDashboardScreen({ navigation }) {
  const { t } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [earnings, droneTasks] = await Promise.all([getEarningsSummary(), listDroneTasks()]);
      setSummary(earnings);
      setTasks(droneTasks);
    } catch (error) {
      Alert.alert('Drone Dashboard', error.response?.data?.error || error.message || 'Impossibile caricare i dati drone.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleVerifyAndPay = async (task) => {
    setVerifyingId(task.id || task._id);
    try {
      await verifyTaskCompletion({ taskId: task.id || task._id, droneId: task.droneId, proof: 'mobile-verified' });
      await triggerAutoPayment({ taskId: task.id || task._id, droneId: task.droneId, amount: task.amount || task.moneroAmount || 0 });
      Alert.alert('Pagamento automatico', 'Task verificato e pagamento XMR inviato al drone.');
      await load(true);
    } catch (error) {
      Alert.alert('Pagamento automatico', error.response?.data?.error || error.message || 'Operazione non riuscita.');
    } finally {
      setVerifyingId(null);
    }
  };

  const completedCount = summary?.completedTasks ?? tasks.filter(t => t.status === 'completed').length;
  const totalXmr = summary?.totalXmr ?? tasks.filter(t => t.status === 'completed').reduce((s, t) => s + (Number(t.amount || t.moneroAmount || 0)), 0);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>{t('common.loading')}</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ {t('order.back')}</Text></TouchableOpacity>
        <Text style={styles.title}>Drone Dashboard</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Task completati</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatXmr(totalXmr)}</Text>
          <Text style={styles.statLabel}>XMR guadagnati</Text>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>Task drone</Text>
        <TouchableOpacity onPress={() => load(true)}><Text style={styles.refresh}>Aggiorna</Text></TouchableOpacity>
      </View>

      {tasks.length === 0 ? <View style={styles.empty}><Text style={styles.emptyText}>Nessun task drone.</Text></View> : <FlatList
        data={tasks}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        keyExtractor={item => String(item.id || item._id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isCompleted = item.status === 'completed';
          return <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskId}>Task #{item.id || item._id}</Text>
              <Text style={[styles.badge, isCompleted ? styles.completed : styles.pending]}>{String(item.status || 'pending').toUpperCase()}</Text>
            </View>
            <Text style={styles.amount}>{item.moneroAmount ? `${formatXmr(item.moneroAmount)} XMR` : `${item.amount || '—'} ${item.currency || ''}`}</Text>
            {item.droneId && <Text style={styles.droneId}>Drone: {item.droneId}</Text>}
            {!isCompleted && <TouchableOpacity style={styles.payButton} onPress={() => handleVerifyAndPay(item)} disabled={verifyingId === (item.id || item._id)}>
              {verifyingId === (item.id || item._id) ? <ActivityIndicator color="white" /> : <Text style={styles.payButtonText}>Verifica e paga</Text>}
            </TouchableOpacity>}
          </View>;
        }}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  back: { color: '#1976D2', fontSize: 16, marginRight: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: '#263238', padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { color: 'white', fontSize: 22, fontWeight: '700' },
  statLabel: { color: '#b0bec5', marginTop: 6, fontSize: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  refresh: { color: '#1976D2' },
  list: { paddingBottom: 20 },
  taskCard: { backgroundColor: 'white', padding: 16, borderRadius: 10, marginBottom: 10 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskId: { fontWeight: '700' },
  badge: { color: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 11, overflow: 'hidden' },
  pending: { backgroundColor: '#f39c12' },
  completed: { backgroundColor: '#2e7d32' },
  amount: { fontSize: 16, marginTop: 10, fontWeight: '600' },
  droneId: { color: '#555', marginTop: 6, fontSize: 12 },
  payButton: { marginTop: 12, backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
  payButtonText: { color: 'white', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyText: { fontSize: 16, marginBottom: 6 },
});
