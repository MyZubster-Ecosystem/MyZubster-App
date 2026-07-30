// app/screens/NotificationSettingsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../services/notificationService';

const NOTIFICATION_TYPES = [
  {
    key: 'orderConfirmed',
    label: 'Order Confirmed',
    description: 'When payment is received and order is confirmed',
    icon: '✅',
  },
  {
    key: 'orderCompleted',
    label: 'Order Completed',
    description: 'When tokens are minted and order is complete',
    icon: '🎉',
  },
  {
    key: 'orderCancelled',
    label: 'Order Cancelled',
    description: 'When an order is cancelled',
    icon: '❌',
  },
  {
    key: 'paymentReminder',
    label: 'Payment Reminder',
    description: '12 hours before payment deadline expires',
    icon: '⏰',
  },
  {
    key: 'dividendReceived',
    label: 'Dividend Received',
    description: 'When rent distribution is received',
    icon: '💰',
  },
  {
    key: 'tokenListing',
    label: 'Token Listing',
    description: 'When a new token is available',
    icon: '🆕',
  },
  {
    key: 'priceAlert',
    label: 'Price Alert',
    description: 'When a token price changes significantly',
    icon: '📊',
  },
];

export default function NotificationSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedSettings = await getNotificationSettings();
    setSettings(savedSettings);
  };

  const toggleSetting = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateNotificationSettings(settings);
    setHasChanges(false);
  };

  const renderToggle = (item) => (
    <View key={item.key} style={styles.toggleItem}>
      <View style={styles.toggleInfo}>
        <View style={styles.toggleHeader}>
          <Text style={styles.toggleIcon}>{item.icon}</Text>
          <Text style={styles.toggleLabel}>{item.label}</Text>
        </View>
        <Text style={styles.toggleDescription}>{item.description}</Text>
      </View>
      <Switch
        value={settings[item.key] ?? true}
        onValueChange={() => toggleSetting(item.key)}
        trackColor={{ false: '#d0d0d0', true: '#a5d6a7' }}
        thumbColor={settings[item.key] ? '#4CAF50' : '#f4f3f4'}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, hasChanges && styles.saveButtonActive]}
          disabled={!hasChanges}
        >
          <Text
            style={[styles.saveButtonText, hasChanges && styles.saveButtonTextActive]}
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Notification Types</Text>
        <Text style={styles.sectionSubtitle}>
          Choose which notifications you want to receive
        </Text>

        <View style={styles.toggleGroup}>
          {NOTIFICATION_TYPES.map(renderToggle)}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How Notifications Work</Text>
          <Text style={styles.infoText}>
            Notifications are delivered via Firebase Cloud Messaging (FCM) through
            Expo's push notification service. They work on both Android and iOS.
          </Text>
          <Text style={styles.infoText}>
            • Notifications appear even when the app is closed{'\n'}
            • Tapping a notification opens the relevant screen{'\n'}
            • Notification history is saved locally on your device{'\n'}
            • Badge counts show unread notifications
          </Text>
        </View>
      </ScrollView>
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
  saveButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  saveButtonActive: { backgroundColor: '#4CAF50' },
  saveButtonText: { fontSize: 14, color: '#999' },
  saveButtonTextActive: { color: '#fff', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  toggleGroup: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  toggleIcon: { fontSize: 16, marginRight: 8 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  toggleDescription: { fontSize: 12, color: '#888', lineHeight: 16 },
  infoBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
  },
  infoTitle: { fontSize: 15, fontWeight: '600', color: '#2e7d32', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#33691e', lineHeight: 20, marginBottom: 6 },
});
