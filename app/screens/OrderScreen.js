import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AuthContext } from '../context/AuthContext';
import PaymentQR from '../components/PaymentQR';
import { cancelOrder, getOrder, subscribeToOrderStatus } from '../services/api';
import {
  buildMoneroPaymentUri,
  formatCountdown,
  formatXmr,
  getRemainingPaymentSeconds,
  normalizeOrder,
  normalizeOrderStatus,
} from '../services/orderUtils';

const STATUS_COPY = {
  pending: 'Waiting for payment',
  processing: 'Confirming payment',
  completed: 'Payment confirmed',
  cancelled: 'Order cancelled',
  expired: 'Payment window expired',
};

export default function OrderScreen({ route, navigation }) {
  const { token } = useContext(AuthContext);
  const initialOrder = route.params?.initialOrder || route.params?.order || null;
  const orderId = route.params?.orderId || initialOrder?.id;
  const [order, setOrder] = useState(initialOrder ? normalizeOrder(initialOrder) : null);
  const [loading, setLoading] = useState(!initialOrder);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const orderRef = useRef(order);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const fetchOrder = useCallback(
    async ({ silent = false } = {}) => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const updatedOrder = await getOrder(orderId, token, orderRef.current || initialOrder || {});
        const normalized = normalizeOrder(updatedOrder, orderRef.current || initialOrder || {});
        orderRef.current = normalized;
        setOrder(normalized);
      } catch (error) {
        if (!silent) {
          Alert.alert(
            'Unable to load order',
            error.response?.data?.error || error.response?.data?.message || error.message || 'Please try again.',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [initialOrder, orderId, token],
  );

  useEffect(() => {
    fetchOrder({ silent: Boolean(initialOrder) });
    const interval = setInterval(() => fetchOrder({ silent: true }), 15000);
    return () => clearInterval(interval);
  }, [fetchOrder, initialOrder]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToOrderStatus(
      orderId,
      token,
      (updatedOrder) => {
        setOrder((current) => {
          const normalized = normalizeOrder(updatedOrder, current || initialOrder || {});
          orderRef.current = normalized;
          return normalized;
        });
      },
      (error) => console.log('Order status socket error:', error),
    );

    return unsubscribe;
  }, [initialOrder, orderId, token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const copyToClipboard = async (text, message) => {
    if (!text) {
      return;
    }

    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', message);
  };

  const handleCancelOrder = () => {
    Alert.alert('Cancel order?', 'This will cancel the pending payment request.', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          try {
            const cancelledOrder = await cancelOrder(order.id, token, order);
            setOrder(cancelledOrder);
          } catch (error) {
            Alert.alert(
              'Unable to cancel',
              error.response?.data?.error || error.response?.data?.message || error.message || 'Please try again.',
            );
          }
        },
      },
    ]);
  };

  if (loading && !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Order not found</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = normalizeOrderStatus(order.status);
  const remainingSeconds = getRemainingPaymentSeconds(order, now);
  const paymentUri = buildMoneroPaymentUri(order.moneroAddress, order.moneroAmount, `MyZubster order ${order.id}`);
  const canPay = status === 'pending' || status === 'processing';
  const canCancel = status === 'pending' && order.id;
  const timerText = canPay
    ? remainingSeconds > 0
      ? formatCountdown(remainingSeconds)
      : 'Expired'
    : 'Closed';
  const createdAtText = order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Unknown';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Order #{order.id || 'Pending'}</Text>
          <Text style={styles.subtitle}>{order.tokenAmount || 0} {order.tokenSymbol || 'token'}</Text>
        </View>
        <View style={[styles.statusPill, styles[`status_${status}`] || styles.status_pending]}>
          <Text style={styles.statusText}>{STATUS_COPY[status] || status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Instructions</Text>
        <View style={styles.qrContainer}>
          <PaymentQR
            address={order.moneroAddress}
            amount={order.moneroAmount}
            label={`MyZubster order ${order.id}`}
          />
        </View>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Amount due</Text>
          <Text style={styles.paymentValue}>{formatXmr(order.moneroAmount)} XMR</Text>
        </View>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment timer</Text>
          <Text style={[styles.paymentValue, remainingSeconds === 0 && canPay && styles.expiredText]}>
            {timerText}
          </Text>
        </View>

        <Text style={styles.addressLabel}>Monero subaddress</Text>
        <TouchableOpacity
          style={styles.addressBox}
          onPress={() => copyToClipboard(order.moneroAddress, 'Monero address copied to clipboard.')}
        >
          <Text style={styles.addressText} selectable>
            {order.moneroAddress || 'The API has not returned a payment subaddress yet.'}
          </Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, !order.moneroAddress && styles.actionButtonDisabled]}
            onPress={() => copyToClipboard(order.moneroAddress, 'Monero address copied to clipboard.')}
            disabled={!order.moneroAddress}
          >
            <Text style={styles.actionButtonText}>Copy Address</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, !paymentUri && styles.actionButtonDisabled]}
            onPress={() => copyToClipboard(paymentUri, 'Monero payment URI copied to clipboard.')}
            disabled={!paymentUri}
          >
            <Text style={styles.actionButtonText}>Copy URI</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status Tracking</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Confirmations</Text>
          <Text style={styles.detailValue}>{order.confirmations || 0}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Received</Text>
          <Text style={styles.detailValue}>{formatXmr(order.amountReceived || 0)} XMR</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Created</Text>
          <Text style={styles.detailValue}>{createdAtText}</Text>
        </View>
        <Text style={styles.statusHint}>
          This screen refreshes every 15 seconds and listens for live order updates when the backend WebSocket is available.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onRefresh}>
          <Text style={styles.secondaryButtonText}>Refresh</Text>
        </TouchableOpacity>
        {canCancel && (
          <TouchableOpacity style={styles.dangerButton} onPress={handleCancelOrder}>
            <Text style={styles.dangerButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 10,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    marginTop: 4,
  },
  statusPill: {
    borderRadius: 8,
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  status_pending: {
    backgroundColor: '#f97316',
  },
  status_processing: {
    backgroundColor: '#2563eb',
  },
  status_completed: {
    backgroundColor: '#16a34a',
  },
  status_cancelled: {
    backgroundColor: '#6b7280',
  },
  status_expired: {
    backgroundColor: '#991b1b',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  paymentLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  paymentValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  expiredText: {
    color: '#991b1b',
  },
  addressLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    marginTop: 12,
  },
  addressBox: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  addressText: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    flex: 1,
    padding: 13,
  },
  actionButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  detailValue: {
    color: '#111827',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
    textAlign: 'right',
  },
  statusHint: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    flex: 1,
    padding: 14,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#991b1b',
    borderRadius: 8,
    flex: 1,
    padding: 14,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
