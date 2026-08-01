import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { listPois, listIssues, listRoutes, listPublicServices, getCityItem, coordinates } from '../services/cityMapService';
import WebMap from '../components/WebMap';
import { useLanguage } from '../context/LanguageContext';

const DEFAULT_REGION = { latitude: 41.9028, longitude: 12.4964, latitudeDelta: 18, longitudeDelta: 18 };

const LAYER_OPTIONS = [
  { key: 'pois', labelKey: 'cityMap.layers.pois' },
  { key: 'issues', labelKey: 'cityMap.layers.issues' },
  { key: 'routes', labelKey: 'cityMap.layers.routes' },
  { key: 'services', labelKey: 'cityMap.layers.services' },
];

const CATEGORY_OPTIONS = [
  { key: 'all', labelKey: 'cityMap.categories.all' },
  { key: 'food', labelKey: 'cityMap.categories.food' },
  { key: 'transport', labelKey: 'cityMap.categories.transport' },
  { key: 'health', labelKey: 'cityMap.categories.health' },
  { key: 'education', labelKey: 'cityMap.categories.education' },
  { key: 'safety', labelKey: 'cityMap.categories.safety' },
  { key: 'public', labelKey: 'cityMap.categories.public' },
];

const STATUS_OPTIONS = [
  { key: 'all', labelKey: 'cityMap.status.all' },
  { key: 'active', labelKey: 'cityMap.status.active' },
  { key: 'pending', labelKey: 'cityMap.status.pending' },
  { key: 'closed', labelKey: 'cityMap.status.closed' },
];

export default function CityMapScreen({ navigation }) {
  const { t } = useLanguage();
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [activeLayers, setActiveLayers] = useState({ pois: true, issues: true, routes: false, services: false });
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);

  const [pois, setPois] = useState([]);
  const [issues, setIssues] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [services, setServices] = useState([]);

  const load = useCallback(async (nextRegion = region) => {
    setLoading(true);
    try {
      const promises = [];
      if (activeLayers.pois) promises.push(listPois({ category, status, search, latitude: nextRegion.latitude, longitude: nextRegion.longitude, radiusKm: 25 }));
      if (activeLayers.issues) promises.push(listIssues({ category, status, search, latitude: nextRegion.latitude, longitude: nextRegion.longitude, radiusKm: 25 }));
      if (activeLayers.routes) promises.push(listRoutes({ category, search }));
      if (activeLayers.services) promises.push(listPublicServices({ category, status, search, latitude: nextRegion.latitude, longitude: nextRegion.longitude, radiusKm: 25 }));

      const results = await Promise.all(promises);
      let idx = 0;
      if (activeLayers.pois) setPois(results[idx++]);
      if (activeLayers.issues) setIssues(results[idx++]);
      if (activeLayers.routes) setRoutes(results[idx++]);
      if (activeLayers.services) setServices(results[idx++]);
    } catch (error) {
      Alert.alert(t('cityMap.title'), error.response?.data?.error || error.message || t('cityMap.alerts.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [activeLayers, category, status, search, region, t]);

  useEffect(() => {
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationDenied(true);
        await load(DEFAULT_REGION);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { ...region, latitude: position.coords.latitude, longitude: position.coords.longitude };
      setRegion(next);
      await load(next);
    })().catch(() => load(DEFAULT_REGION));
  }, []);

  const handleMarkerPress = useCallback(async (item, type) => {
    setSelected(item);
    try {
      const detailData = await getCityItem(type, item.id || item._id);
      setDetail(detailData);
    } catch (error) {
      setDetail(item);
    }
  }, []);

  const focusUser = async () => {
    try {
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { ...region, latitude: p.coords.latitude, longitude: p.coords.longitude };
      setRegion(next);
    } catch {
      Alert.alert(t('cityMap.alerts.locationError'), t('cityMap.alerts.locationErrorMessage'));
    }
  };

  const toggleLayer = (key) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const webMarkers = useMemo(() => {
    const all = [
      ...(activeLayers.pois ? pois.map(p => ({ ...p, _type: 'poi', color: '#4CAF50' })) : []),
      ...(activeLayers.issues ? issues.map(i => ({ ...i, _type: 'issue', color: '#f44336' })) : []),
      ...(activeLayers.routes ? routes.map(r => ({ ...r, _type: 'route', color: '#2196F3' })) : []),
      ...(activeLayers.services ? services.map(s => ({ ...s, _type: 'service', color: '#FF9800' })) : []),
    ];
    return all.filter(item => {
      const point = coordinates(item);
      return point;
    }).map(item => {
      const point = coordinates(item);
      return { ...item, latitude: point.latitude, longitude: point.longitude };
    });
  }, [activeLayers, pois, issues, routes, services]);

  const nativeMarkers = useMemo(() => {
    const all = [
      ...(activeLayers.pois ? pois.map(p => ({ ...p, _type: 'poi', _color: '#4CAF50' })) : []),
      ...(activeLayers.issues ? issues.map(i => ({ ...i, _type: 'issue', _color: '#f44336' })) : []),
      ...(activeLayers.routes ? routes.map(r => ({ ...r, _type: 'route', _color: '#2196F3' })) : []),
      ...(activeLayers.services ? services.map(s => ({ ...s, _type: 'service', _color: '#FF9800' })) : []),
    ];
    return all.map(item => ({ item, point: coordinates(item) })).filter(m => m.point);
  }, [activeLayers, pois, issues, routes, services]);

  const getItemTypeLabel = (type) => {
    switch (type) {
      case 'poi': return t('cityMap.layers.pois');
      case 'issue': return t('cityMap.layers.issues');
      case 'route': return t('cityMap.layers.routes');
      case 'service': return t('cityMap.layers.services');
      default: return type;
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>{t('cityMap.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('cityMap.title')}</Text>
        </View>

        <View style={styles.controls}>
          <View style={styles.layerRow}>
            {LAYER_OPTIONS.map(layer => (
              <TouchableOpacity
                key={layer.key}
                style={[styles.layerChip, activeLayers[layer.key] && styles.layerChipActive]}
                onPress={() => toggleLayer(layer.key)}
              >
                <Text style={[styles.layerChipText, activeLayers[layer.key] && styles.layerChipTextActive]}>
                  {t(layer.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterRow}>
            <TextInput
              style={styles.filterInput}
              placeholder={t('cityMap.searchPlaceholder')}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.filterButton} onPress={() => load()}>
              <Text style={styles.filterButtonText}>{t('cityMap.searchButton')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipRow}>
            <Text style={styles.filterLabel}>{t('cityMap.categoryLabel')}</Text>
            {CATEGORY_OPTIONS.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.chip, category === cat.key && styles.chipActive]}
                onPress={() => setCategory(cat.key)}
              >
                <Text style={[styles.chipText, category === cat.key && styles.chipTextActive]}>
                  {t(cat.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.chipRow}>
            <Text style={styles.filterLabel}>{t('cityMap.statusLabel')}</Text>
            {STATUS_OPTIONS.map(st => (
              <TouchableOpacity
                key={st.key}
                style={[styles.chip, status === st.key && styles.chipActive]}
                onPress={() => setStatus(st.key)}
              >
                <Text style={[styles.chipText, status === st.key && styles.chipTextActive]}>
                  {t(st.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.mapContainer}>
          <WebMap
            region={region}
            markers={webMarkers}
            onMarkerPress={(marker) => handleMarkerPress(marker, marker._type)}
            onRegionChange={setRegion}
          />
        </View>

        <TouchableOpacity style={styles.locate} onPress={focusUser}>
          <Text style={styles.locateText}>◎</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color="#4CAF50" />
            <Text style={styles.loadingText}>{t('cityMap.loading')}</Text>
          </View>
        )}

        {selected && (
          <View style={styles.detail}>
            <TouchableOpacity style={styles.closeButton} onPress={() => { setSelected(null); setDetail(null); }}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>{detail?.name || selected.name || t('cityMap.detail.defaultTitle')}</Text>
            <Text style={styles.detailType}>{getItemTypeLabel(selected._type)}</Text>
            {detail?.description && <Text style={styles.detailDescription}>{detail.description}</Text>}
            {detail?.address && <Text style={styles.detailAddress}>📍 {detail.address}</Text>}
            {detail?.status && <Text style={styles.detailStatus}>{t('cityMap.detail.status')}: {detail.status}</Text>}
            {detail?.category && <Text style={styles.detailCategory}>{t('cityMap.detail.category')}: {detail.category}</Text>}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{t('cityMap.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('cityMap.title')}</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.layerRow}>
          {LAYER_OPTIONS.map(layer => (
            <TouchableOpacity
              key={layer.key}
              style={[styles.layerChip, activeLayers[layer.key] && styles.layerChipActive]}
              onPress={() => toggleLayer(layer.key)}
            >
              <Text style={[styles.layerChipText, activeLayers[layer.key] && styles.layerChipTextActive]}>
                {t(layer.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterRow}>
          <TextInput
            style={styles.filterInput}
            placeholder={t('cityMap.searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.filterButton} onPress={() => load()}>
            <Text style={styles.filterButtonText}>{t('cityMap.searchButton')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chipRow}>
          <Text style={styles.filterLabel}>{t('cityMap.categoryLabel')}</Text>
          {CATEGORY_OPTIONS.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.chip, category === cat.key && styles.chipActive]}
              onPress={() => setCategory(cat.key)}
            >
              <Text style={[styles.chipText, category === cat.key && styles.chipTextActive]}>
                {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.chipRow}>
          <Text style={styles.filterLabel}>{t('cityMap.statusLabel')}</Text>
          {STATUS_OPTIONS.map(st => (
            <TouchableOpacity
              key={st.key}
              style={[styles.chip, status === st.key && styles.chipActive]}
              onPress={() => setStatus(st.key)}
            >
              <Text style={[styles.chipText, status === st.key && styles.chipTextActive]}>
                {t(st.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <MapView
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={!locationDenied}
        provider={PROVIDER_GOOGLE}
      >
        {nativeMarkers.map(({ item, point }) => (
          <Marker
            key={String(item.id || item._id || `${point.latitude}:${point.longitude}`)}
            coordinate={point}
            title={item.name || item.title || t('cityMap.detail.defaultTitle')}
            description={`${item.category || ''} · ${item.status || ''}`}
            onPress={() => handleMarkerPress(item, item._type)}
          />
        ))}
      </MapView>

      <TouchableOpacity style={styles.locate} onPress={focusUser}>
        <Text style={styles.locateText}>◎</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color="#4CAF50" />
          <Text style={styles.loadingText}>{t('cityMap.loading')}</Text>
        </View>
      )}

      {selected && (
        <View style={styles.detail}>
          <TouchableOpacity style={styles.closeButton} onPress={() => { setSelected(null); setDetail(null); }}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.detailTitle}>{detail?.name || selected.name || t('cityMap.detail.defaultTitle')}</Text>
          <Text style={styles.detailType}>{getItemTypeLabel(selected._type)}</Text>
          {detail?.description && <Text style={styles.detailDescription}>{detail.description}</Text>}
          {detail?.address && <Text style={styles.detailAddress}>📍 {detail.address}</Text>}
          {detail?.status && <Text style={styles.detailStatus}>{t('cityMap.detail.status')}: {detail.status}</Text>}
          {detail?.category && <Text style={styles.detailCategory}>{t('cityMap.detail.category')}: {detail.category}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  toolbar: { padding: 16, paddingBottom: 8 },
  back: { color: '#1976D2', fontSize: 16 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  controls: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  layerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  layerChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd' },
  layerChipActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  layerChipText: { color: '#333', fontWeight: '600', fontSize: 12 },
  layerChipTextActive: { color: 'white' },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  filterInput: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  filterButton: { backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  filterButtonText: { color: 'white', fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 },
  filterLabel: { fontSize: 12, color: '#555', fontWeight: '600' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  chipText: { color: '#333', fontWeight: '600', fontSize: 11 },
  chipTextActive: { color: 'white' },
  map: { flex: 1 },
  mapContainer: { flex: 1 },
  locate: { position: 'absolute', right: 16, top: Platform.OS === 'web' ? 200 : 140, backgroundColor: 'white', borderRadius: 24, padding: 10, elevation: 3 },
  locateText: { fontSize: 24, color: '#1976D2' },
  loading: { position: 'absolute', top: Platform.OS === 'web' ? 210 : 150, alignSelf: 'center', flexDirection: 'row', gap: 8, backgroundColor: 'white', borderRadius: 8, padding: 10 },
  loadingText: { color: '#333' },
  detail: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 5 },
  closeButton: { position: 'absolute', right: 14, top: 8, fontSize: 24, color: '#666' },
  closeText: { fontSize: 24, color: '#666' },
  detailTitle: { fontSize: 18, fontWeight: '700', marginBottom: 5 },
  detailType: { color: '#555', fontSize: 12, textTransform: 'uppercase', marginBottom: 8 },
  detailDescription: { fontSize: 14, color: '#333', lineHeight: 20 },
  detailAddress: { marginTop: 8, color: '#555', fontSize: 13 },
  detailStatus: { marginTop: 6, color: '#555', fontSize: 13 },
  detailCategory: { marginTop: 4, color: '#555', fontSize: 13 },
});
