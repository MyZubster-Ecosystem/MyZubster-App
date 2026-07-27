// app/screens/NotificationHistoryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  getNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotificationHistory,
} from '../services/notificationService';

const TYPE_LABELS = {
  orderConfirmed: 'Order Confirmed',
  orderCompleted: 'Order Completed',
  orderCancelled: 'Order Cancelled',
  paymentReminder: 'Payment Reminder',
  dividendReceived: 'Dividend Received',
  tokenListing: 'Token Listing',
  priceAlert: 'Price Alert',
  general: 'General',
};

const TYPE_ICONS = {
  orderConfirmed: '✅',
  orderCompleted: '🎉',
  orderCancelled: '❌',
  paymentReminder: '⏰',
  dividendReceived: '💰',
  tokenListing: '🆕',
  priceAlert: '📊',
  general: '📬',
};

export default function NotificationHistoryScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    const history = await getNotificationHistory();
    setNotifications(history);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handleMarkAsRead = async (id) => {
    await markNotificationAsRead(id);
    await loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    await loadNotifications();
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearNotificationHistory();
            await loadNotifications();
          },
        },
      ]
    );
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unread]}
      onPress={() => handleMarkAsRead(item.id)}
    >
      <View style={styles.notificationIcon}>
        <Text style={styles.iconText}>
          {TYPE_ICONS[item.type] || TYPE_ICONS.general}
        </Text>
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationType}>
            {TYPE_LABELS[item.type] || item.type}
          </Text>
          <Text style={styles.notificationTime}>{formatTime(item.receivedAt)}</Text>
        </View>
        <Text style={styles.notificationTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.some((n) => !n.read) && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerAction}>
              <Text style={styles.headerActionText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.headerAction}>
              <Text style={[styles.headerActionText, styles.clearText]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            You'll see order updates, payment reminders, and alerts here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: { fontSize: 16, color: '#4CAF50' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerAction: { paddingVertical: 4, paddingHorizontal: 8 },
  headerActionText: { fontSize: 14, color: '#4CAF50' },
  clearText: { color: '#f44336' },
  list: { padding: 12 },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unread: {
    backgroundColor: '#f1f8e9',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 18 },
  notificationContent: { flex: 1 },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationType: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },
  notificationTime: { fontSize: 11, color: '#999' },
  notificationTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  notificationBody: { fontSize: 13, color: '#666', lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
    marginTop: 6,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
});
