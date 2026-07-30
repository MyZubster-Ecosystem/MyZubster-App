import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ListingCard from '../components/ListingCard';
import { AuthContext } from '../context/AuthContext';
import { fetchListings } from '../services/listingsService';

const {
  getUserId,
  isListingOwnedBy,
} = require('../services/listingUtils');

const getErrorMessage = (error) =>
  error.response?.data?.error ||
  error.message ||
  'Your listings could not be loaded.';

export default function MarketplaceProfileScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const userId = getUserId(user);

  const loadListings = useCallback(
    async (refresh = false) => {
      refresh ? setRefreshing(true) : setLoading(true);
      setError('');

      try {
        if (!userId) {
          throw new Error('The signed-in user has no marketplace user ID.');
        }
        const allListings = await fetchListings();
        setListings(
          allListings.filter((listing) => isListingOwnedBy(listing, user))
        );
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, userId]
  );

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('Marketplace')}
        >
          <Text style={styles.back}>‹ Marketplace</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.navigate('PublishListing')}
        >
          <Text style={styles.publish}>+ Publish</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{user?.name || user?.username || 'My profile'}</Text>
      {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
      <Text style={styles.sectionTitle}>Published skills</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2e7d32" size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => loadListings()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.list,
            listings.length === 0 && styles.emptyList,
          ]}
          data={listings}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No published skills yet</Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => navigation.navigate('PublishListing')}
              >
                <Text style={styles.emptyAction}>Publish your first listing</Text>
              </TouchableOpacity>
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
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  back: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '700',
  },
  publish: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '800',
  },
  title: {
    color: '#17202a',
    fontSize: 24,
    fontWeight: '800',
  },
  email: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#374151',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 24,
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
  emptyTitle: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyAction: {
    color: '#2e7d32',
    fontWeight: '700',
    marginTop: 10,
  },
  error: {
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
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
