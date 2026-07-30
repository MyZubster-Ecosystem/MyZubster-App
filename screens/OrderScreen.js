import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const API_URL = 'https://api.my-zubster.com';

export default function OrderScreen({ route, navigation }) {
  const token = route?.params?.token || {};
  const [amount, setAmount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const price = Number(token.pricePerToken || 0);
  const total = price * Number(amount || 0);

  const handleCreateOrder = async () => {
    if (!amount || Number(amount) <= 0) { Alert.alert('Error', 'Enter valid amount'); return; }
    if (!walletAddress) { Alert.alert('Error', 'Enter your Monero wallet address'); return; }
    setLoading(true);
    try {
      const tok = await AsyncStorage.getItem('token');
      const res = await fetch(API_URL + '/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
        body: JSON.stringify({ tokenSymbol: token.symbol, amount: Number(amount), walletAddress, totalPrice: total }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Order Created', 'Order created. Send ' + total + ' XMR to complete payment.', [
          { text: 'View Orders', onPress: () => navigation.navigate('Orders') },
          { text: 'OK' },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to create order');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create Order</Text>
      <View style={styles.tokenInfo}>
        <Text style={styles.tokenSymbol}>{token.symbol || '???'}</Text>
        <Text style={styles.tokenPrice}>S$ {price.toLocaleString()} / token</Text>
      </View>
      <Text style={styles.label}>Amount (tokens)</Text>
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1" placeholderTextColor="#484f58" />
      <View style={styles.totalRow}><Text style={styles.totalLabel}>Total (XMR):</Text><Text style={styles.totalValue}>{total.toLocaleString()} XMR</Text></View>
      <Text style={styles.label}>Monero Wallet Address</Text>
      <TextInput style={styles.input} value={walletAddress} onChangeText={setWalletAddress} placeholder="4..." placeholderTextColor="#484f58" autoCapitalize="none" />
      <TouchableOpacity style={styles.button} onPress={handleCreateOrder} disabled={loading}>
        {loading ? <ActivityIndicator color="#0d1117" /> : <Text style={styles.buttonText}>Create Order ({total} XMR)</Text>}
      </TouchableOpacity>
      <Text style={styles.note}>Orders are paid in Monero (XMR). A unique payment address will be generated.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', padding: 20 },
  title: { color: '#f7931a', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  tokenInfo: { backgroundColor: '#161b22', borderRadius: 10, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#30363d', alignItems: 'center' },
  tokenSymbol: { color: '#f7931a', fontSize: 22, fontWeight: 'bold' },
  tokenPrice: { color: '#8b949e', fontSize: 14, marginTop: 4 },
  label: { color: '#c9d1d9', fontSize: 15, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#161b22', color: '#fff', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#30363d', fontSize: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, padding: 12, backgroundColor: '#161b22', borderRadius: 8 },
  totalLabel: { color: '#8b949e', fontSize: 15 },
  totalValue: { color: '#f7931a', fontSize: 18, fontWeight: 'bold' },
  button: { backgroundColor: '#f7931a', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#0d1117', fontWeight: 'bold', fontSize: 16 },
  note: { color: '#484f58', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
