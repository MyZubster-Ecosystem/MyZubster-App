import React, { useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { createOrder } from '../services/api';
import {
  ORDER_TOKENS,
  calculateOrderTotals,
  formatXmr,
  getPaymentExpiry,
} from '../services/orderUtils';

export default function CreateOrderScreen({ navigation, route }) {
  const { token, user } = useContext(AuthContext);
  const routeToken = route.params?.token;
  const [selectedToken, setSelectedToken] = useState(routeToken || ORDER_TOKENS[0]);
  const [amount, setAmount] = useState('1');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => calculateOrderTotals(selectedToken, amount), [amount, selectedToken]);
  const canSubmit = !loading && totals.tokenAmount > 0 && totals.moneroAmount > 0;

  const handleCreateOrder = async () => {
    if (!canSubmit) {
      Alert.alert('Invalid order', 'Select a token and enter an amount greater than zero.');
      return;
    }

    const createdAt = new Date().toISOString();
    const fallbackOrder = {
      tokenSymbol: selectedToken.symbol,
      tokenName: selectedToken.name,
      tokenAmount: totals.tokenAmount,
      unitPriceXmr: totals.unitPriceXmr,
      amount: totals.moneroAmount,
      currency: 'XMR',
      moneroAmount: totals.moneroAmount,
      status: 'pending',
      customerEmail,
      notes: notes.trim(),
      createdAt,
      paymentExpiresAt: getPaymentExpiry(createdAt),
    };

    setLoading(true);

    try {
      const order = await createOrder(
        {
          tokenSymbol: selectedToken.symbol,
          tokenName: selectedToken.name,
          tokenAmount: totals.tokenAmount,
          unitPriceXmr: totals.unitPriceXmr,
          amount: totals.moneroAmount,
          totalPrice: totals.moneroAmount,
          moneroAmount: totals.moneroAmount,
          currency: 'XMR',
          customerEmail: customerEmail || user?.email,
          notes: notes.trim(),
        },
        token,
        fallbackOrder,
      );

      Alert.alert('Order created', 'Open the payment screen to complete the Monero payment.');
      navigation.replace('Order', { orderId: order.id, initialOrder: order });
    } catch (error) {
      Alert.alert(
        'Order creation failed',
        error.response?.data?.error || error.response?.data?.message || error.message || 'Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Order</Text>
        <Text style={styles.subtitle}>Select a token, enter the amount, then pay the generated Monero invoice.</Text>

        <Text style={styles.sectionLabel}>Token</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tokenScroller}>
          {ORDER_TOKENS.map((item) => {
            const selected = item.symbol === selectedToken.symbol;

            return (
              <TouchableOpacity
                key={item.symbol}
                style={[styles.tokenButton, selected && styles.tokenButtonSelected]}
                onPress={() => setSelectedToken(item)}
              >
                <Text style={[styles.tokenSymbol, selected && styles.tokenTextSelected]}>{item.symbol}</Text>
                <Text style={[styles.tokenPrice, selected && styles.tokenTextSelected]}>
                  {formatXmr(item.unitPriceXmr)} XMR
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionLabel}>Amount</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="1"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.sectionLabel}>Customer email</Text>
        <TextInput
          style={styles.input}
          value={customerEmail}
          onChangeText={setCustomerEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="customer@example.com"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.sectionLabel}>Order notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Service details, delivery notes, or escrow context"
          placeholderTextColor="#9ca3af"
        />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Token</Text>
            <Text style={styles.summaryValue}>{selectedToken.symbol}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Token amount</Text>
            <Text style={styles.summaryValue}>{totals.tokenAmount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Unit price</Text>
            <Text style={styles.summaryValue}>{formatXmr(totals.unitPriceXmr)} XMR</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total due</Text>
            <Text style={styles.totalValue}>{formatXmr(totals.moneroAmount)} XMR</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleCreateOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Monero Order</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
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
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    marginTop: 8,
  },
  sectionLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 14,
  },
  tokenScroller: {
    marginHorizontal: -4,
  },
  tokenButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    minWidth: 132,
    padding: 14,
  },
  tokenButtonSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tokenSymbol: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  tokenPrice: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 6,
  },
  tokenTextSelected: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    padding: 14,
  },
  notesInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 22,
    padding: 16,
  },
  summaryTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  summaryLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  summaryValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  totalRow: {
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    marginTop: 6,
    paddingTop: 12,
  },
  totalLabel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  totalValue: {
    color: '#f97316',
    fontSize: 18,
    fontWeight: '900',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 8,
    marginTop: 18,
    padding: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
