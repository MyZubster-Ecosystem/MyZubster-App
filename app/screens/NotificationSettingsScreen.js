import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  NOTIFICATION_TYPES,
  getNotificationSettings,
  saveNotificationSettings,
  registerForPushNotificationsAsync,
  getStoredPushToken,
} from '../services/notificationService';

export default function NotificationSettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    (async () => {
      setSettings(await getNotificationSettings());
      setToken((await getStoredPushToken()) || '');
    })();
  }, []);

  const update = async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await saveNotificationSettings(next);
    if (key === 'enabled' && value) {
      const result = await registerForPushNotificationsAsync();
      setToken(result.token || '');
      if (result.status !== 'granted') {
        Alert.alert('Permission needed', 'Enable notification permission to receive push alerts.');
      }
    }
  };

  if (!settings) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.back}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Notification Settings</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Enable notifications</Text>
        <Switch value={!!settings.enabled} onValueChange={(v) => update('enabled', v)} />
      </View>

      {Object.entries(NOTIFICATION_TYPES).map(([key, label]) => (
        <View style={styles.row} key={key}>
          <Text style={styles.label}>{label}</Text>
          <Switch
            value={settings[key] !== false}
            disabled={!settings.enabled}
            onValueChange={(v) => update(key, v)}
          />
        </View>
      ))}

      <Text style={styles.tokenLabel}>Device push token</Text>
      <Text style={styles.token}>{token || 'Not registered yet'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  content: { padding: 20, paddingBottom: 40 },
  back: { color: '#f59e0b', marginBottom: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 18 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  label: { color: '#eee', flex: 1, paddingRight: 12 },
  tokenLabel: { color: '#aaa', marginTop: 24, marginBottom: 6 },
  token: { color: '#888', fontSize: 12 },
  loading: { color: '#aaa', marginTop: 40, textAlign: 'center' },
});
