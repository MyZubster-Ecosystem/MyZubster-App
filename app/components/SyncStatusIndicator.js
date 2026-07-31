import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { getNetworkStatus, addNetworkStatusListener } from '../services/networkStatusService';
import { getPendingCount, replayQueue } from '../services/offlineQueue';

export default function SyncStatusIndicator({ onSyncPress, replayItem }) {
  const [status, setStatus] = useState(() => getNetworkStatus());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch (error) {
      // ignore
    }
  }, []);

  useEffect(() => {
    const unsubscribe = addNetworkStatusListener(setStatus);
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 3000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshPendingCount]);

  const handlePress = async () => {
    if (status !== 'online' || pendingCount === 0 || !replayItem) return;
    setSyncing(true);
    try {
      await replayQueue(replayItem);
      await refreshPendingCount();
      onSyncPress?.();
    } catch (error) {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  const isOnline = status === 'online';
  const dotColor = isOnline ? '#4CAF50' : '#F44336';
  const label = isOnline ? 'Online' : 'Offline';
  const subtitle = pendingCount > 0 ? `${pendingCount} pending` : 'Synced';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={!isOnline || pendingCount === 0 || !replayItem}
      style={[styles.container, !isOnline && styles.containerOffline]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.textContainer}>
        <Text style={[styles.label, !isOnline && styles.labelOffline]}>{label}</Text>
        {!!syncing && <Text style={styles.subtitle}>Syncing…</Text>}
        {!syncing && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!syncing && (
        <Animated.View style={styles.spinner} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
  },
  containerOffline: {
    backgroundColor: '#FFEBEE',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  textContainer: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  labelOffline: {
    color: '#C62828',
  },
  subtitle: {
    fontSize: 11,
    color: '#616161',
  },
  spinner: {
    marginLeft: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderTopColor: 'transparent',
  },
});
