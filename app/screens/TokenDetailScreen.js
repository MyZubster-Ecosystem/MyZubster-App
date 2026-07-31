import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken, getTokenStats } from '../services/tokenService';

const FAVORITES_KEY = '@myzubster_favorites';

function SimpleLineChart({ points, width = 340, height = 160 }) {
  if (!points || points.length < 2) {
    return <View style={[styles.chartBox, { width, height }]}><Text style={styles.chartEmpty}>Dati storico non disponibili</Text></View>;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);
  const padding = 10;
  const usableHeight = height - padding * 2;
  const coords = points.map((value, index) => ({
    x: index * stepX,
    y: padding + usableHeight - ((value - min) / range) * usableHeight,
  }));

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${path} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  return (
    <View style={[styles.chartBox, { width, height }]}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Prezzo</Text>
        <Text style={styles.chartSub}>{points.length} punti</Text>
      </View>
      <View style={styles.chartWrap}>
        <View style={[styles.chart, { width, height }]}>
          <View style={[styles.line, { width, height }]}>
            <View style={styles.svgWrap}>
              <View style={[styles.linePath, { width, height }]}>
                <View style={[styles.linePathInner, { width, height }]} />
              </View>
            </View>
            <View style={[styles.areaPath, { width, height }]} />
            {coords.map((c, i) => (
              <View key={i} style={[styles.dot, { left: c.x - 3, top: c.y - 3, width: 6, height: 6 }]} />
            ))}
          </View>
        </View>
      </View>
      <View style={styles.chartLegend}>
        <Text style={styles.chartLegendText}>Min {Number(min).toFixed(4)}</Text>
        <Text style={styles.chartLegendText}>Max {Number(max).toFixed(4)}</Text>
      </View>
    </View>
  );
}

export default function TokenDetailScreen({ route, navigation }) {
  const { tokenId, token } = route.params || {};
  const [data, setData] = useState(token || null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(!token);
  const [favorite, setFavorite] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenId) return;
      try {
        const [tokenData, statsData] = await Promise.all([getToken(tokenId), getTokenStats(tokenId)]);
        if (cancelled) return;
        setData(tokenData);
        setStats(statsData);
        const history = Array.isArray(statsData?.priceHistory) ? statsData.priceHistory : Array.isArray(statsData?.history) ? statsData.history : [];
        const prices = history.map(h => Number(h.price ?? h.value ?? h.close ?? 0)).filter(Number.isFinite);
        setPriceHistory(prices);
      } catch (error) {
        if (cancelled) return;
        Alert.alert('Token', error.response?.data?.error || error.message || 'Impossibile caricare il token.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tokenId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAVORITES_KEY);
        if (!cancelled && raw) {
          const list = JSON.parse(raw);
          const currentId = data?.id || data?._id || tokenId;
          setFavorite(list.some(f => (f.id || f._id) === currentId));
        }
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [data, tokenId]);

  const toggleFavorite = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const currentId = data?.id || data?._id || tokenId;
      const exists = list.some(f => (f.id || f._id) === currentId);
      let next;
      if (exists) {
        next = list.filter(f => (f.id || f._id) !== currentId);
        setFavorite(false);
      } else {
        next = [...list, data];
        setFavorite(true);
      }
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch (e) {
      Alert.alert('Preferiti', 'Impossibile aggiornare i preferiti.');
    }
  }, [data, tokenId]);

  const handleBuy = useCallback(() => {
    const id = data?.id || data?._id || tokenId;
    if (!id) return Alert.alert('Token', 'Identificatore token mancante.');
    navigation.navigate('CreateOrder', { tokenId: id, token: data });
  }, [navigation, data, tokenId]);

  const handleShare = useCallback(async () => {
    try {
      const name = data?.name || 'Token';
      const symbol = data?.symbol || '';
      const message = `Dettagli token ${name} (${symbol})\nPrezzo: ${data?.price ?? '—'}\nTipo: ${data?.type || '—'}\nStato: ${data?.status || '—'}`;
      await Share.share({ title: name, message });
    } catch (e) {
      // share dismissed
    }
  }, [data]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>Caricamento token…</Text></View>;
  }

  if (!data) {
    return <View style={styles.center}><Text style={styles.emptyText}>Token non trovato.</Text></View>;
  }

  const tokenAddress = data.address || data.contractAddress || data.tokenAddress || '—';
  const area = data.area || data.valuationArea || data.size || '—';
  const valuation = data.valuation || data.marketCap || data.valuationUsd || '—';
  const yield_ = data.yield || data.apy || data.incomeYield || '—';
  const totalSupply = data.totalSupply ?? data.supply ?? '—';
  const sold = data.sold || data.soldAmount || data.circulatingSupply ?? '—';
  const remaining = data.remaining || data.remainingAmount || data.remainingSupply ?? '—';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
        <Text style={styles.title}>Dettaglio token</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.tokenHeader}>
          <View style={styles.tokenIcon}>
            <Text style={styles.tokenInitial}>{String(data.symbol || data.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.tokenTitleWrap}>
            <Text style={styles.tokenName}>{data.name || 'Unnamed'}</Text>
            <Text style={styles.tokenSymbol}>{data.symbol || '---'}</Text>
          </View>
          <TouchableOpacity onPress={toggleFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.favoriteIcon, favorite && styles.favoriteIconActive]}>{favorite ? '★' : '☆'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Prezzo</Text><Text style={styles.metaValue}>{data.price != null ? Number(data.price).toFixed(4) : '—'}</Text></View>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Tipo</Text><Text style={styles.metaValue}>{data.type || '—'}</Text></View>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Stato</Text><Text style={styles.metaValue}>{data.status || '—'}</Text></View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dettagli asset</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Indirizzo</Text><Text selectable style={styles.detailValue}>{tokenAddress}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Area</Text><Text style={styles.detailValue}>{area}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Valutazione</Text><Text style={styles.detailValue}>{valuation}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Rendimento</Text><Text style={styles.detailValue}>{yield_}</Text></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Riepilogo investimento</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Offerta totale</Text><Text style={styles.detailValue}>{totalSupply}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Venduti</Text><Text style={styles.detailValue}>{sold}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Rimanenti</Text><Text style={styles.detailValue}>{remaining}</Text></View>
      </View>

      <View style={styles.card}>
        <SimpleLineChart points={priceHistory} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleBuy}><Text style={styles.buttonText}>Acquista</Text></TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}><Text style={styles.secondaryText}>Condividi</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  topRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 },
  back: { color: '#1976D2', fontSize: 16, marginRight: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 14 },
  tokenHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tokenIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tokenInitial: { color: 'white', fontWeight: '700', fontSize: 18 },
  tokenTitleWrap: { flex: 1 },
  tokenName: { fontSize: 18, fontWeight: '700' },
  tokenSymbol: { color: '#777' },
  favoriteIcon: { fontSize: 24, color: '#aaa', marginLeft: 8 },
  favoriteIconActive: { color: '#FFD700' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flex: 1 },
  metaLabel: { color: '#777', fontSize: 12 },
  metaValue: { fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { color: '#777' },
  detailValue: { fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 24 },
  primaryButton: { flex: 1, backgroundColor: '#4CAF50', padding: 14, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '700' },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: '#4CAF50', padding: 14, borderRadius: 10, alignItems: 'center' },
  secondaryText: { color: '#277d35', fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: '#777' },
  chartBox: { alignSelf: 'center', backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  chartTitle: { fontWeight: '700' },
  chartSub: { color: '#777', fontSize: 12 },
  chartWrap: { alignItems: 'center', justifyContent: 'center' },
  chart: { backgroundColor: '#fafafa', borderRadius: 8, overflow: 'hidden' },
  line: { position: 'relative' },
  svgWrap: { position: 'absolute', left: 0, top: 0 },
  linePath: { position: 'absolute', left: 0, top: 0 },
  linePathInner: { position: 'absolute', left: 0, top: 0, backgroundColor: '#4CAF50', height: 2, transform: [{ rotate: '0deg' }] },
  areaPath: { position: 'absolute', left: 0, top: 0, backgroundColor: 'rgba(76,175,80,0.12)' },
  dot: { position: 'absolute', borderRadius: 3, backgroundColor: '#4CAF50' },
  chartEmpty: { color: '#999' },
  chartLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  chartLegendText: { color: '#777', fontSize: 12 },
});
