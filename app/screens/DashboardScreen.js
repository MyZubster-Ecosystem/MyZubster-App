// app/screens/DashboardScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import { connectOrbot, isOrbotInstalled, isOrbotConnected } from '../services/orbotService';

export default function DashboardScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationContext);
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orbotInstalled, setOrbotInstalled] = useState(false);
  const [orbotConnected, setOrbotConnected] = useState(false);

  useEffect(() => {
    fetchOrders();
    checkOrbotStatus();
  }, []);

  const checkOrbotStatus = async () => {
    const installed = await isOrbotInstalled();
    setOrbotInstalled(installed);
    const connected = await isOrbotConnected();
    setOrbotConnected(connected);
  };

  const handleOrbot = async () => {
    if (orbotConnected) {
      Alert.alert('🧅 Orbot connesso', 'Sei già connesso al marketplace onion.');
      return;
    }
    const result = await connectOrbot();
    if (result) {
      setOrbotConnected(true);
      Alert.alert('✅ Orbot connesso', 'Ora sei connesso al marketplace onion in modo anonimo.');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/my-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(response.data || []);
    } catch (error) {
      console.error('Errore recupero ordini:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: t('dashboard.status.pending'),
      completed: t('dashboard.status.completed'),
      cancelled: t('dashboard.status.cancelled'),
    };
    return statusMap[status] || status.toUpperCase();
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('Order', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{t('dashboard.orderId', { id: item.id })}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.completed : styles.pending,
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.orderAmount}>
        {t('dashboard.amount', { amount: item.amount, currency: item.currency })}
      </Text>
      {item.moneroAddress && (
        <Text style={styles.moneroAddress} numberOfLines={1}>
          {t('dashboard.moneroAddress', { address: item.moneroAddress })}
        </Text>
      )}
      <Text style={styles.orderDate}>
        {t('dashboard.date', { date: new Date(item.createdAt).toLocaleDateString() })}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>{t('dashboard.welcome', { name: user?.name || 'Utente' })}</Text>
          <View style={styles.orbotStatus}>
            <Text style={styles.orbotStatusText}>
              {orbotConnected ? '🧅 Onion' : orbotInstalled ? '📡 Orbot disponibile' : '📡 Orbot non installato'}
            </Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.orbotButton, orbotConnected ? styles.orbotConnected : styles.orbotDisconnected]}
            onPress={handleOrbot}
          >
            <Text style={styles.orbotButtonText}>
              {orbotConnected ? '🧅 On' : orbotInstalled ? '🧅 Orbot' : '📲 Installa'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('NotificationHistory')}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateOrder')}
          >
            <Text style={styles.createButtonText}>{t('dashboard.newOrder')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('dashboard.title')}</Text>

      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('dashboard.noOrders')}</Text>
          <Text style={styles.emptySubtext}>{t('dashboard.noOrdersSub')}</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcome: { fontSize: 20, fontWeight: 'bold' },
  orbotStatus: { marginTop: 2 },
  orbotStatusText: { fontSize: 12, color: '#666' },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  createButtonText: { color: '#fff', fontWeight: 'bold' },
  orbotButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  orbotConnected: { backgroundColor: '#4CAF50' },
  orbotDisconnected: { backgroundColor: '#7B2FBE' },
  orbotButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  notificationButton: {
    position: 'relative',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  notificationIcon: { fontSize: 22 },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  list: { paddingBottom: 20 },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: { fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pending: { backgroundColor: '#ff9800' },
  completed: { backgroundColor: '#4CAF50' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  orderAmount: { fontSize: 14, color: '#333', marginTop: 6 },
  moneroAddress: { fontSize: 12, color: '#888', marginTop: 4 },
  orderDate: { fontSize: 11, color: '#aaa', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#666' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 8 },
});