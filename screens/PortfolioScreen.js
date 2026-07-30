import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const API_URL = 'https://api.my-zubster.com';

export default function PortfolioScreen() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tok = await AsyncStorage.getItem('token');
        const res = await fetch(API_URL + '/api/portfolio', { headers: { 'Authorization': 'Bearer ' + tok } });
        setPortfolio(await res.json());
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <ActivityIndicator size="large" color="#f7931a" style={{flex:1,backgroundColor:'#0d1117'}} />;

  const p = portfolio || {};
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.totalLabel}>Total Value</Text>
        <Text style={styles.totalValue}>S$ {Number(p.totalValue || 0).toLocaleString()}</Text>
        <Text style={styles.change}>+{p.totalChange || 0}% all time</Text>
      </View>
      <View style={styles.stats}>
        <StatBox label="Tokens" value={p.tokenCount || 0} />
        <StatBox label="XMR Earned" value={(p.xmrEarned || 0) + ' XMR'} />
        <StatBox label="Orders" value={p.orderCount || 0} />
      </View>
      <Text style={styles.sectionTitle}>Holdings</Text>
      <FlatList
        data={p.holdings || []}
        renderItem={({ item }) => (
          <View style={styles.holding}>
            <View><Text style={styles.holdingSymbol}>{item.symbol}</Text><Text style={styles.holdingAmount}>{item.amount} tokens</Text></View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={styles.holdingValue}>S$ {Number(item.value || 0).toLocaleString()}</Text>
              <Text style={item.change >= 0 ? styles.up : styles.down}>{item.change >= 0 ? '+' : ''}{item.change}%</Text>
            </View>
          </View>
        )}
        keyExtractor={i => i.symbol}
      />
    </View>
  );
}

const StatBox = ({ label, value }) => (
  <View style={styles.statBox}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117', padding: 16 },
  header: { alignItems: 'center', padding: 20, backgroundColor: '#161b22', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#30363d' },
  totalLabel: { color: '#8b949e', fontSize: 13 },
  totalValue: { color: '#f7931a', fontSize: 36, fontWeight: 'bold' },
  change: { color: '#3fb950', fontSize: 14, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#161b22', borderRadius: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#30363d' },
  statValue: { color: '#c9d1d9', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#8b949e', fontSize: 11, marginTop: 4 },
  sectionTitle: { color: '#f7931a', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  holding: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#161b22', borderRadius: 8, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#30363d' },
  holdingSymbol: { color: '#c9d1d9', fontSize: 16, fontWeight: '600' },
  holdingAmount: { color: '#8b949e', fontSize: 12 },
  holdingValue: { color: '#c9d1d9', fontSize: 15, fontWeight: '600' },
  up: { color: '#3fb950', fontSize: 12 },
  down: { color: '#f85149', fontSize: 12 },
});
