import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getNotificationHistory,
  markNotificationRead,
  clearNotificationHistory,
  getUnreadCount,
} from '../services/notificationService';

export default function NotificationHistoryScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setItems(await getNotificationHistory());
    setUnread(await getUnreadCount());
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const onPressItem = async (item) => {
    const next = await markNotificationRead(item.id);
    setItems(next);
    setUnread(await getUnreadCount());
    if (item.orderId) {
      navigation.navigate('Order', { orderId: item.orderId });
    } else if (item.deepLink === 'CreateOrder') {
      navigation.navigate('CreateOrder');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications {unread ? `(${unread})` : ''}</Text>
        <TouchableOpacity
          onPress={async () => {
            await clearNotificationHistory();
            load();
          }}
        >
          <Text style={styles.clear}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, !item.read && styles.unread]} onPress={() => onPressItem(item)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
            <Text style={styles.meta}>{item.type} · {new Date(item.createdAt).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#f59e0b' },
  clear: { color: '#f87171' },
  title: { color: '#fff', fontWeight: '700', fontSize: 16 },
  empty: { color: '#777', textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#1a1a1a', marginHorizontal: 16, marginVertical: 6, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a' },
  unread: { borderColor: '#f59e0b' },
  cardTitle: { color: '#fff', fontWeight: '700', marginBottom: 4 },
  cardBody: { color: '#ccc', marginBottom: 8 },
  meta: { color: '#777', fontSize: 12 },
});
