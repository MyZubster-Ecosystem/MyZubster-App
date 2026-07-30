import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ListingCard from '../components/ListingCard';
import { fetchListings } from '../services/listingsService';

const { filterListings } = require('../services/listingUtils');

const getErrorMessage = (error) =>
  error.response?.data?.error ||
  error.message ||
  'The marketplace could not be loaded.';

export default function MarketplaceScreen({ navigation, route }) {
  const [listings, setListings] = useState([]);
  const [query, setQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadListings = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');

    try {
      setListings(await fetchListings());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings, route.params?.refreshAt]);

  const visibleListings = useMemo(
    () => filterListings(listings, { query, minPrice, maxPrice }),
    [listings, query, minPrice, maxPrice]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={styles.secondaryAction}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Marketplace</Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('MarketplaceProfile')}
        >
          <Text style={styles.secondaryAction}>My profile</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.publishButton}
        onPress={() => navigation.navigate('PublishListing')}
      >
        <Text style={styles.publishButtonText}>+ Publish a skill</Text>
      </TouchableOpacity>

      <TextInput
        accessibilityLabel="Search marketplace"
        autoCapitalize="none"
        onChangeText={setQuery}
        placeholder="Search title, description, or seller"
        style={styles.searchInput}
        value={query}
      />

      <View style={styles.filterRow}>
        <TextInput
          accessibilityLabel="Minimum XMR price"
          keyboardType="decimal-pad"
          onChangeText={setMinPrice}
          placeholder="Min XMR"
          style={styles.priceInput}
          value={minPrice}
        />
        <TextInput
          accessibilityLabel="Maximum XMR price"
          keyboardType="decimal-pad"
          onChangeText={setMaxPrice}
          placeholder="Max XMR"
          style={styles.priceInput}
          value={maxPrice}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2e7d32" size="large" />
          <Text style={styles.mutedText}>Loading listings…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => loadListings()}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.list,
            visibleListings.length === 0 && styles.emptyList,
          ]}
          data={visibleListings}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No matching skills</Text>
              <Text style={styles.mutedText}>
                Adjust the search or price filters.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              onRefresh={() => loadListings(true)}
              refreshing={refreshing}
            />
          }
          renderItem={({ item }) => <ListingCard listing={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: '#17202a',
    fontSize: 22,
    fontWeight: '800',
  },
  secondaryAction: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '700',
  },
  publishButton: {
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    marginBottom: 12,
    paddingVertical: 12,
  },
  publishButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderColor: '#d8dee4',
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#d8dee4',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  list: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mutedText: {
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#374151',
    fontSize: 17,
    fontWeight: '700',
  },
  errorText: {
    color: '#b42318',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#17202a',
    borderRadius: 8,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
