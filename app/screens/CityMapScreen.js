import { fetchPois, fetchIssues, fetchRoutes, fetchPublicServices, searchLocation } from '../services/cityMapService';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal, ScrollView, SafeAreaView } from 'react-native';
import MapView, { Marker, Callout, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLanguage } from '../context/LanguageContext';

const DEFAULT_REGION = { latitude: 41.9028, longitude: 12.4964, latitudeDelta: 0.05, longitudeDelta: 0.05 };

const LAYER_TYPES = [
  { key: 'pois', labelKey: 'cityMap.layerPois', color: '#4CAF50', icon: '📍' },
  { key: 'issues', labelKey: 'cityMap.layerIssues', color: '#f44336', icon: '⚠️' },
  { key: 'routes', labelKey: 'cityMap.layerRoutes', color: '#2196F3', icon: '🛣️' },
  { key: 'publicServices', labelKey: 'cityMap.layerPublicServices', color: '#FF9800', icon: '🏛️' },
];

const POI_CATEGORIES = ['all', 'restaurant', 'cafe', 'shop', 'park', 'museum', 'hospital', 'school', 'other'];
const ISSUE_STATUSES = ['all', 'open', 'in_progress', 'resolved', 'closed'];

function getCoordinate(item) {
  if (!item) return null;
  const lat = Number(item.latitude ?? item.lat ?? item.location?.latitude ?? item.location?.lat);
  const lng = Number(item.longitude ?? item.lng ?? item.location?.longitude ?? item.location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
}

function getRouteCoordinates(route) {
  if (!route?.coordinates || !Array.isArray(route.coordinates)) return [];
  return route.coordinates
    .map(c => ({ latitude: Number(c.lat ?? c.latitude), longitude: Number(c.lng ?? c.longitude) }))
    .filter(c => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
}

export default function CityMapScreen({ navigation }) {
  const { t } = useLanguage();
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [pois, setPois] = useState([]);
  const [issues, setIssues] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [publicServices, setPublicServices] = useState([]);
  const [activeLayers, setActiveLayers] = useState({ pois: true, issues: true, routes: true, publicServices: true });
  const [poiCategory, setPoiCategory] = useState('all');
  const [issueStatus, setIssueStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadData = useCallback(async (nextRegion = region) => {
    setLoading(true);
    try {
      const [poisData, issuesData, routesData, servicesData] = await Promise.all([
        fetchPois({ category: poiCategory, latitude: nextRegion.latitude, longitude: nextRegion.longitude, radius: 5000 }),
        fetchIssues({ status: issueStatus, latitude: nextRegion.latitude, longitude: nextRegion.longitude, radius: 5000 }),
        fetchRoutes({ latitude: nextRegion.latitude, longitude: nextRegion.longitude, radius: 5000 }),
        fetchPublicServices({ latitude: nextRegion.latitude, longitude: nextRegion.longitude, radius: 5000 }),
      ]);
      setPois(poisData);
      setIssues(issuesData);
      setRoutes(routesData);
      setPublicServices(servicesData);
    } catch (error) {
      Alert.alert(t('cityMap.title'), error.response?.data?.error || error.message || t('cityMap.alert.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [poiCategory, issueStatus, region, t]);

  useEffect(() => {
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationDenied(true);
        await loadData(DEFAULT_REGION);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { ...region, latitude: position.coords.latitude, longitude: position.coords.longitude };
      setRegion(next);
      await loadData(next);
    })().catch(() => loadData(DEFAULT_REGION));
  // Load once on mount; filter changes trigger explicit load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await searchLocation(searchQuery);
      if (results.length > 0) {
        const first = results[0];
        const coord = getCoordinate(first);
        if (coord) {
          setRegion({ ...region, latitude: coord.latitude, longitude: coord.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        }
      } else {
        Alert.alert(t('cityMap.title'), t('cityMap.alert.noResults'));
      }
    } catch (error) {
      Alert.alert(t('cityMap.title'), error.response?.data?.error || error.message || t('cityMap.alert.searchFailed'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, region, t]);

  const focusUser = async () => {
    try {
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { ...region, latitude: p.coords.latitude, longitude: p.coords.longitude };
      setRegion(next);
      await loadData(next);
    } catch {
      Alert.alert(t('cityMap.title'), t('cityMap.alert.locationFailed'));
    }
  };

  const poiMarkers = useMemo(() => {
    if (!activeLayers.pois) return [];
    return pois
      .filter(p => poiCategory === 'all' || p.category === poiCategory)
      .map(p => {
        const coord = getCoordinate(p);
        return coord ? { item: p, point: coord, type: 'pois' } : null;
      })
      .filter(Boolean);
  }, [pois, activeLayers.pois, poiCategory]);

  const issueMarkers = useMemo(() => {
    if (!activeLayers.issues) return [];
    return issues
      .filter(i => issueStatus === 'all' || i.status === issueStatus)
      .map(i => {
        const coord = getCoordinate(i);
        return coord ? { item: i, point: coord, type: 'issues' } : null;
      })
      .filter(Boolean);
  }, [issues, activeLayers.issues, issueStatus]);

  const serviceMarkers = useMemo(() => {
    if (!activeLayers.publicServices) return [];
    return publicServices
      .map(s => {
        const coord = getCoordinate(s);
        return coord ? { item: s, point: coord, type: 'publicServices' } : null;
      })
      .filter(Boolean);
  }, [publicServices, activeLayers.publicServices]);

  const routeLines = useMemo(() => {
    if (!activeLayers.routes) return [];
    return routes.map(r => {
      const coords = getRouteCoordinates(r);
      return coords.length > 1 ? { route: r, coordinates: coords } : null;
    }).filter(Boolean);
  }, [routes, activeLayers.routes]);

  const toggleLayer = (layerKey) => {
    setActiveLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const showDetail = (item, type) => {
    setSelectedItem(item);
    setSelectedType(type);
    setDetailModalVisible(true);
  };

  const renderDetailContent = () => {
    if (!selectedItem) return null;
    const typeLabels = {
      pois: t('cityMap.layerPois'),
      issues: t('cityMap.layerIssues'),
      routes: t('cityMap.layerRoutes'),
      publicServices: t('cityMap.layerPublicServices'),
    };
    return (
      <ScrollView>
        <View style={styles.detailHeader}>
          <Text style={styles.detailType}>{typeLabels[selectedType] || selectedType}</Text>
          <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
            <Text style={styles.detailClose}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.detailTitle}>{selectedItem.title || selectedItem.name || selectedItem.id}</Text>
        {selectedItem.description && <Text style={styles.detailDesc}>{selectedItem.description}</Text>}
        {selectedItem.address && <Text style={styles.detailAddr}>📍 {selectedItem.address}</Text>}
        {selectedItem.category && <Text style={styles.detailMeta}>{t('cityMap.category')}: {selectedItem.category}</Text>}
        {selectedItem.status && <Text style={styles.detailMeta}>{t('cityMap.status')}: {selectedItem.status}</Text>}
        {selectedItem.distance && <Text style={styles.detailMeta}>📏 {selectedItem.distance} m</Text>}
        {selectedItem.phone && <Text style={styles.detailMeta}>📞 {selectedItem.phone}</Text>}
        {selectedItem.website && <Text style={styles.detailMeta}>🌐 {selectedItem.website}</Text>}
        {selectedItem.openingHours && <Text style={styles.detailMeta}>🕐 {selectedItem.openingHours}</Text>}
      </ScrollView>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /><Text>{t('common.loading')}</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ {t('common.back')}</Text></TouchableOpacity>
        <Text style={styles.title}>{t('cityMap.title')}</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('cityMap.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>{t('common.search')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>{t('cityMap.layers')}</Text>
          <View style={styles.layerChips}>
            {LAYER_TYPES.map(layer => (
              <TouchableOpacity
                key={layer.key}
                style={[styles.layerChip, activeLayers[layer.key] && styles.layerChipActive, { borderColor: layer.color }]}
                onPress={() => toggleLayer(layer.key)}
              >
                <Text style={[styles.layerChipText, activeLayers[layer.key] && styles.layerChipTextActive, { color: layer.color }]}>
                  {layer.icon} {t(layer.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>{t('cityMap.poiCategory')}</Text>
          <View style={styles.filterChips}>
            {POI_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, poiCategory === cat && styles.filterChipActive]}
                onPress={() => { setPoiCategory(cat); loadData(); }}
              >
                <Text style={[styles.filterChipText, poiCategory === cat && styles.filterChipTextActive]}>
                  {cat === 'all' ? t('cityMap.all') : t(`cityMap.poiCategory.${cat}`, { defaultValue: cat })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>{t('cityMap.issueStatus')}</Text>
          <View style={styles.filterChips}>
            {ISSUE_STATUSES.map(status => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, issueStatus === status && styles.filterChipActive]}
                onPress={() => { setIssueStatus(status); loadData(); }}
              >
                <Text style={[styles.filterChipText, issueStatus === status && styles.filterChipTextActive]}>
                  {status === 'all' ? t('cityMap.all') : t(`cityMap.issueStatus.${status}`, { defaultValue: status })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {locationDenied && (
        <Text style={styles.warning}>{t('cityMap.locationDenied')}</Text>
      )}

      <MapView
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={!locationDenied}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {poiMarkers.map(({ item, point }) => (
          <Marker
            key={String(item.id || item._id || `${point.latitude}:${point.longitude}`)}
            coordinate={point}
            title={item.title || item.name || 'POI'}
            description={`${item.category || ''}`}
            onPress={() => showDetail(item, 'pois')}
          >
            <View style={[styles.marker, { backgroundColor: '#4CAF50' }]}><Text style={styles.markerText}>📍</Text></View>
          </Marker>
        ))}

        {issueMarkers.map(({ item, point }) => (
          <Marker
            key={String(item.id || item._id || `${point.latitude}:${point.longitude}`)}
            coordinate={point}
            title={item.title || item.name || 'Issue'}
            description={`${item.status || ''}`}
            onPress={() => showDetail(item, 'issues')}
          >
            <View style={[styles.marker, { backgroundColor: '#f44336' }]}><Text style={styles.markerText}>⚠️</Text></View>
          </Marker>
        ))}

        {serviceMarkers.map(({ item, point }) => (
          <Marker
            key={String(item.id || item._id || `${point.latitude}:${point.longitude}`)}
            coordinate={point}
            title={item.title || item.name || 'Service'}
            description={`${item.category || ''}`}
            onPress={() => showDetail(item, 'publicServices')}
          >
            <View style={[styles.marker, { backgroundColor: '#FF9800' }]}><Text style={styles.markerText}>🏛️</Text></View>
          </Marker>
        ))}

        {routeLines.map(({ route, coordinates }) => (
          <Polyline
            key={String(route.id || route._id)}
            coordinates={coordinates}
            strokeColor="#2196F3"
            strokeWidth={3}
            geodesic={true}
          />
        ))}
      </MapView>

      <TouchableOpacity style={styles.locate} onPress={focusUser}><Text style={styles.locateText}>◎</Text></TouchableOpacity>

      {loading && <View style={styles.loading}><ActivityIndicator color="#4CAF50" /><Text>{t('common.loading')}</Text></View>}

      <Modal visible={detailModalVisible} animationType="slide" transparent={true} onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay} onTouchStart={() => setDetailModalVisible(false)}>
          <View style={styles.modalContent} onTouchStart={e => e.stopPropagation()}>
            {renderDetailContent()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  toolbar: { padding: 16, paddingBottom: 8 },
  back: { color: '#1976D2', fontSize: 16 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  searchBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  searchButton: { backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  searchButtonText: { color: 'white', fontWeight: '700' },
  filters: { paddingHorizontal: 16, paddingBottom: 8 },
  filterGroup: { marginBottom: 12 },
  filterLabel: { fontSize: 13, color: '#555', marginBottom: 6 },
  layerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  layerChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  layerChipActive: { backgroundColor: '#e8f5e9' },
  layerChipText: { fontSize: 12, fontWeight: '600' },
  layerChipTextActive: { fontWeight: '700' },
  filterChip: { borderWidth: 1, borderColor: '#4CAF50', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  filterChipActive: { backgroundColor: '#4CAF50' },
  filterChipText: { fontSize: 12, color: '#277d35', fontWeight: '600' },
  filterChipTextActive: { color: 'white', fontWeight: '700' },
  warning: { paddingHorizontal: 16, color: '#9a6300', marginBottom: 6 },
  map: { flex: 1 },
  locate: { position: 'absolute', right: 16, top: 140, backgroundColor: 'white', borderRadius: 24, padding: 10, elevation: 3 },
  locateText: { fontSize: 24, color: '#1976D2' },
  loading: { position: 'absolute', top: 150, alignSelf: 'center', flexDirection: 'row', gap: 8, backgroundColor: 'white', borderRadius: 8, padding: 10 },
  marker: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white', elevation: 2 },
  markerText: { fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  detailType: { fontSize: 14, color: '#777', fontWeight: '600' },
  detailClose: { fontSize: 28, color: '#666' },
  detailTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  detailDesc: { fontSize: 14, color: '#444', marginBottom: 8 },
  detailAddr: { fontSize: 13, color: '#666', marginBottom: 4 },
  detailMeta: { fontSize: 13, color: '#555', marginBottom: 3 },
});