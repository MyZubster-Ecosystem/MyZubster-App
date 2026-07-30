import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('user').then(u => { if (u) setUser(JSON.parse(u)); setLoading(false); });
  }, []);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove(['token', 'user']);
        navigation.replace('Auth');
      }},
    ]);
  };

  if (loading) return <ActivityIndicator size="large" color="#f7931a" style={{flex:1}} />;

  return (
    <View style={styles.container}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text></View>
      <Text style={styles.name}>{user?.name || 'User'}</Text>
      <Text style={styles.email}>{user?.email || 'No email'}</Text>
      <View style={styles.stats}>
        <View style={styles.statItem}><Text style={styles.statValue}>{user?.orders || 0}</Text><Text style={styles.statLabel}>Orders</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{user?.tokens || 0}</Text><Text style={styles.statLabel}>Tokens</Text></View>
        <View style={styles.statItem}><Text style={styles.statValue}>{user?.dividends || '0.00'}</Text><Text style={styles.statLabel}>XMR</Text></View>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', alignItems: 'center', paddingTop: 60 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f7931a', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { color: '#0d1117', fontSize: 32, fontWeight: 'bold' },
  name: { color: '#c9d1d9', fontSize: 22, fontWeight: '600' },
  email: { color: '#8b949e', fontSize: 15, marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 30, gap: 20 },
  statItem: { alignItems: 'center', backgroundColor: '#161b22', padding: 16, borderRadius: 10, minWidth: 90 },
  statValue: { color: '#f7931a', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#8b949e', fontSize: 12, marginTop: 4 },
  logoutButton: { marginTop: 40, backgroundColor: '#da3633', padding: 14, borderRadius: 8, paddingHorizontal: 40 },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
