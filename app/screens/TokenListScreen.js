import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listTokens } from '../services/tokenService';

const FAVORITES_KEY = '@myzubster_favorites';
const VIEW_MODE_KEY = '@myzubster_token_view_mode';

const SORT_OPTIONS = [
  { label: 'Price', value: 'price' },
  { label: 'Supply', value: 'supply' },
  { label: 'Popularity', value: 'popularity' },
];

const TYPE_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'ERC20', value: 'erc20' },
  { label: 'BEP20', value: 'bep20' },
  { label: 'SPL', value: 'spl' },
  { label: 'Native', value: 'native' },
];

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { label: 'Archived', value: 'archived' },
];

function TokenCard({ item, isGrid, onPress, onFavorite, isFavorite }) {
  return (
    <TouchableOpacity
      style={[isGrid ? styles.gridCard : styles.listCard, isFavorite && styles.favoriteCard]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={isGrid ? styles.gridBody : styles.listBody}>
        <View style={styles.cardHeader}>
          <View style={styles.tokenIcon}>
            <Text style={styles.tokenInitial}>{String(item.symbol || item.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.tokenTitleWrap}>
            <Text style={styles.tokenName} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
            <Text style={styles.tokenSymbol}>{item.symbol || '---'}</Text>
          </View>
          <TouchableOpacity onPress={() => onFavorite(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>{isFavorite ? '★' : '☆'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Price</Text>
            <Text style={styles.metaValue}>{item.price != null ? Number(item.price).toFixed(4) : '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Type</Text>
            <Text style={styles.metaValue}>{item.type || '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={[styles.metaValue, item.status === 'active' ? styles.statusActive : styles.statusMuted]}>{item.status || '—'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TokenListScreen({ navigation }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [favorites, setFavorites] = useState([]);

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('price');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    (async () => {
      try {
        const [storedView, storedFav] = await Promise.all([
          AsyncStorage.getItem(VIEW_MODE_KEY),
          AsyncStorage.getItem(FAVORITES_KEY),
        ]);
        if (storedView) setViewMode(storedView);
        if (storedFav) setFavorites(JSON.parse(storedFav));
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const persistFavorites = async (next) => {
    try { await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch (e) { /* ignore */ }
  };

  const persistViewMode = async (mode) => {
    try { await AsyncStorage.setItem(VIEW_MODE_KEY, mode); } catch (e) { /* ignore */ }
  };

  const load = useCallback(async (pageNum = 1, isRefresh = false, append = false) => {
    if (isRefresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = {
        page: pageNum,
        limit: 20,
        search: search || undefined,
        type: filterType || undefined,
        status: filterStatus || undefined,
        minPrice: filterMinPrice || undefined,
        maxPrice: filterMaxPrice || undefined,
        sortBy,
        sortOrder,
      };
      const data = await listTokens(params);
      const next = Array.isArray(data) ? data : data.tokens || data.items || [];
      setTokens(prev => append ? [...prev, ...next] : next);
      setHasMore(next.length >= 20);
      setPage(pageNum);
    } catch (error) {
      Alert.alert('Tokens', error.response?.data?.error || error.message || 'Impossibile caricare i token.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [search, filterType, filterStatus, filterMinPrice, filterMaxPrice, sortBy, sortOrder]);

  useEffect(() => {
    load(1, false, false);
  }, [load]);

  const handleRefresh = useCallback(() => load(1, true, false), [load]);

  const handleEndReached = useCallback(() => {
    if (loadingMore || !hasMore) return;
    load(page + 1, false, true);
  }, [loadingMore, hasMore, page, load]);

  const toggleFavorite = useCallback((token) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === token.id || f._id === token.id);
      const next = exists ? prev.filter(f => f.id !== token.id && f._id !== token.id) : [...prev, token];
      persistFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((token) => favorites.some(f => (f.id || f._id) === (token.id || token._id)), [favorites]);

  const toggleViewMode = useCallback(async (mode) => {
    setViewMode(mode);
    await persistViewMode(mode);
  }, []);

  const renderItem = useCallback(({ item }) => (
    <TokenCard
      item={item}
      isGrid={viewMode === 'grid'}
      onPress={() => navigation.navigate('TokenDetail', { tokenId: item.id || item._id, token: item })}
      onFavorite={toggleFavorite}
      isFavorite={isFavorite(item)}
    />
  ), [navigation, viewMode, toggleFavorite, isFavorite]);

  const keyExtractor = useCallback((item, index) => String(item.id || item._id || index), []);

  const listEmpty = useMemo(() => (
    <View style={styles.center}><Text style={styles.emptyText}>Nessun token disponibile.</Text></View>
  ), []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>Caricamento token…</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
        <Text style={styles.title}>Token</Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca nome o simbolo"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.iconButton} onPress={() => setShowFilters(!showFilters)}><Text style={styles.iconButtonText}>Filtri</Text></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => setShowSort(!showSort)}><Text style={styles.iconButtonText}>Ordina</Text></TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => toggleViewMode(viewMode === 'grid' ? 'list' : 'grid')}><Text style={styles.iconButtonText}>{viewMode === 'grid' ? '☰' : '⊞'}</Text></TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Tipo</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[styles.chip, filterType === opt.value && styles.chipActive]} onPress={() => setFilterType(opt.value)}>
                <Text style={[styles.chipText, filterType === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.filterLabel}>Stato</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[styles.chip, filterStatus === opt.value && styles.chipActive]} onPress={() => setFilterStatus(opt.value)}>
                <Text style={[styles.chipText, filterStatus === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.filterLabel}>Prezzo (min - max)</Text>
          <View style={styles.priceRow}>
            <TextInput style={styles.priceInput} placeholder="Min" keyboardType="decimal-pad" value={filterMinPrice} onChangeText={setFilterMinPrice} />
            <Text style={styles.priceDash}>-</Text>
            <TextInput style={styles.priceInput} placeholder="Max" keyboardType="decimal-pad" value={filterMaxPrice} onChangeText={setFilterMaxPrice} />
          </View>
          <TouchableOpacity style={styles.applyButton} onPress={() => { setShowFilters(false); load(1, false, false); }}><Text style={styles.applyButtonText}>Applica filtri</Text></TouchableOpacity>
        </View>
      )}

      {showSort && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Criterio</Text>
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[styles.chip, sortBy === opt.value && styles.chipActive]} onPress={() => setSortBy(opt.value)}>
                <Text style={[styles.chipText, sortBy === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.chip, sortOrder === 'asc' && styles.chipActive, styles.sortToggle]} onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
            <Text style={[styles.chipText, sortOrder === 'asc' && styles.chipTextActive]}>{sortOrder === 'asc' ? 'Crescente ▲' : 'Decrescente ▼'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={() => { setShowSort(false); load(1, false, false); }}><Text style={styles.applyButtonText}>Applica ordinamento</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        data={tokens}
        keyExtractor={keyExtractor}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#4CAF50']} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={loadingMore ? <View style={styles.center}><ActivityIndicator color="#4CAF50" /></View> : !hasMore && tokens.length > 0 ? <Text style={styles.endText}>Fine dei risultati</Text> : null}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={viewMode === 'grid' ? styles.row : undefined}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  topRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 },
  back: { color: '#1976D2', fontSize: 16, marginRight: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  toolbar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10, alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: 'white', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#ddd' },
  iconButton: { backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd' },
  iconButtonText: { color: '#333', fontWeight: '600' },
  filterPanel: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  filterLabel: { fontWeight: '700', marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f2f2f2', borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  chipText: { color: '#333', fontSize: 13 },
  chipTextActive: { color: 'white', fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  priceInput: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#ddd' },
  priceDash: { color: '#777' },
  applyButton: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, alignItems: 'center' },
  applyButtonText: { color: 'white', fontWeight: '700' },
  sortToggle: { alignSelf: 'flex-start' },
  listContent: { padding: 16 },
  row: { justifyContent: 'space-between' },
  gridCard: { flex: 1, margin: 6, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  listCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  favoriteCard: { borderColor: '#FFD700' },
  gridBody: { padding: 12 },
  listBody: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tokenIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  tokenInitial: { color: 'white', fontWeight: '700' },
  tokenTitleWrap: { flex: 1 },
  tokenName: { fontSize: 15, fontWeight: '700' },
  tokenSymbol: { color: '#777', fontSize: 12 },
  favoriteIcon: { fontSize: 20, color: '#aaa', marginLeft: 8 },
  favoriteIconActive: { color: '#FFD700' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem: { flex: 1 },
  metaLabel: { color: '#777', fontSize: 11 },
  metaValue: { fontWeight: '700', marginTop: 2 },
  statusActive: { color: '#2e7d32' },
  statusMuted: { color: '#777' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyText: { color: '#777' },
  endText: { color: '#999', textAlign: 'center', paddingVertical: 12 },
});
