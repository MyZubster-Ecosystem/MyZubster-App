import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const formatXmr = (value) => {
  const price = Number(value);
  if (!Number.isFinite(price)) {
    return '0';
  }

  return price.toFixed(12).replace(/\.?0+$/, '');
};

export default function ListingCard({ listing }) {
  return (
    <View style={styles.card}>
      {listing.image_url ? (
        <Image
          accessibilityLabel=""
          source={{ uri: listing.image_url }}
          style={styles.image}
        />
      ) : null}
      <View style={styles.heading}>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>{formatXmr(listing.price_xmr)} XMR</Text>
      </View>
      <Text style={styles.description}>{listing.description}</Text>
      {listing.seller_name ? (
        <Text style={styles.seller}>Published by {listing.seller_name}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#e9ecef',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    color: '#17202a',
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 12,
  },
  price: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '700',
  },
  description: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  seller: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 10,
  },
});
