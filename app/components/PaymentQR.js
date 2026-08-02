import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { buildMoneroPaymentUri, formatXmr } from '../services/orderUtils';

export default function PaymentQR({ address, amount, label, size = 220 }) {
  if (!address) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <Text style={styles.placeholderText}>Waiting for payment address</Text>
      </View>
    );
  }

  const paymentUri = buildMoneroPaymentUri(address, amount, label);

  return (
    <View style={styles.wrapper}>
      <QRCode value={paymentUri} size={size} backgroundColor="#ffffff" color="#111827" />
      <Text style={styles.caption}>monero:{formatXmr(amount)} XMR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  caption: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 10,
  },
  placeholder: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
});
