import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

// Web-only map using Leaflet. In Expo web, this can mount into a div.
// On native, this component should not be used; use CityMapScreen with react-native-maps instead.

const LAYER_TYPES = [
  { key: 'pois', labelKey: 'cityMap.layerPois', color: '#4CAF50' },
  { key: 'issues', labelKey: 'cityMap.layerIssues', color: '#f44336' },
  { key: 'routes', labelKey: 'cityMap.layerRoutes', color: '#2196F3' },
  { key: 'publicServices', labelKey: 'cityMap.layerPublicServices', color: '#FF9800' },
];

export default function WebMap({ navigation }) {
  const { t } = useLanguage();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [activeLayers, setActiveLayers] = useState({ pois: true, issues: true, routes: true, publicServices: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setError('WebMap is only available on web');
      return;
    }

    let cancelled = false;

    async function initMap() {
      try {
        // Dynamically import Leaflet only on web to avoid bundling it for native
        const L = await import('leaflet');
        if (cancelled) return;

        if (!mapRef.current) return;

        // Default view: Rome-ish center, similar to CityMapScreen default region
        const map = L.map(mapRef.current, {
          center: [41.9028, 12.4964],
          zoom: 13,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setLoaded(true);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load map');
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const loadData = async () => {
    if (!mapInstanceRef.current) return;
    const L = await import('leaflet');
    const map = mapInstanceRef.current;
    map.eachLayer(layer => {
      if (!layer._url) {
        map.removeLayer(layer);
      }
    });

    try {
      const base = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000/api';
      const promises = [];
      if (activeLayers.pois) promises.push(fetch(`${base}/city-map/pois`).then(r => r.json()));
      if (activeLayers.issues) promises.push(fetch(`${base}/city-map/issues`).then(r => r.json()));
      if (activeLayers.routes) promises.push(fetch(`${base}/city-map/routes`).then(r => r.json()));
      if (activeLayers.publicServices) promises.push(fetch(`${base}/city-map/public-services`).then(r => r.json()));

      const results = await Promise.all(promises);
      let idx = 0;
      if (activeLayers.pois) addMarkers(results[idx++], 'pois', '#4CAF50', '📍', L);
      if (activeLayers.issues) addMarkers(results[idx++], 'issues', '#f44336', '⚠️', L);
      if (activeLayers.publicServices) addMarkers(results[idx++], 'publicServices', '#FF9800', '🏛️', L);
      if (activeLayers.routes) addRoutes(results[idx++], '#2196F3', L);
    } catch (err) {
      setError(err.message);
    }
  };

  const addMarkers = (items, type, color, icon, L) => {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      const lat = Number(item.latitude ?? item.lat ?? item.location?.latitude ?? item.location?.lat);
      const lng = Number(item.longitude ?? item.lng ?? item.location?.longitude ?? item.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.marker([lat, lng]).addTo(mapInstanceRef.current);
      marker.bindPopup(`<b>${item.title || item.name || type}</b><br/>${item.category || item.status || ''}`);
    });
  };

  const addRoutes = (items, color, L) => {
    if (!Array.isArray(items)) return;
    items.forEach(route => {
      if (!route.coordinates || !Array.isArray(route.coordinates)) return;
      const coords = route.coordinates
        .map(c => [Number(c.lat ?? c.latitude), Number(c.lng ?? c.longitude)])
        .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (coords.length > 1) {
        L.polyline(coords, { color, weight: 3 }).addTo(mapInstanceRef.current);
      }
    });
  };

  useEffect(() => {
    if (loaded && Platform.OS === 'web') {
      loadData();
    }
  }, [loaded, activeLayers]);

  const toggleLayer = (key) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    // In a real app, call a geocoding endpoint. Here we just keep it as a stub.
    Alert?.alert?.((typeof t !== 'undefined' ? t('cityMap.title') : 'Map'), 'Search is not implemented in the web stub.');
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>WebMap is only available on web.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()}>
          <Text style={{ color: '#1976D2', fontSize: 16 }}>‹ {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>{t('cityMap.title')}</Text>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
        <TextInput
          style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 }}
          placeholder={t('cityMap.searchPlaceholder')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={{ backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' }} onPress={handleSearch}>
          <Text style={{ color: 'white', fontWeight: '700' }}>{t('common.search')}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LAYER_TYPES.map(layer => (
          <TouchableOpacity
            key={layer.key}
            style={[
              { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderColor: layer.color },
              activeLayers[layer.key] && { backgroundColor: '#e8f5e9' },
            ]}
            onPress={() => toggleLayer(layer.key)}
          >
            <Text style={[{ fontSize: 12, fontWeight: '600', color: layer.color }, activeLayers[layer.key] && { fontWeight: '700' }]}>
              {t(layer.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={{ paddingHorizontal: 16, color: 'red', marginBottom: 6 }}>{error}</Text>}

      <View ref={mapRef} style={{ flex: 1, backgroundColor: '#ddd' }} />

      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' }}>
            <ScrollView>
              <Text style={{ fontSize: 14, color: '#777', fontWeight: '600', marginBottom: 12 }}>{detailItem?.type || ''}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>{detailItem?.title || detailItem?.name || ''}</Text>
              {detailItem?.description && <Text style={{ fontSize: 14, color: '#444', marginBottom: 8 }}>{detailItem.description}</Text>}
              {detailItem?.address && <Text style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>📍 {detailItem.address}</Text>}
              {detailItem?.category && <Text style={{ fontSize: 13, color: '#555', marginBottom: 3 }}>{t('cityMap.category')}: {detailItem.category}</Text>}
              {detailItem?.status && <Text style={{ fontSize: 13, color: '#555', marginBottom: 3 }}>{t('cityMap.status')}: {detailItem.status}</Text>}
            </ScrollView>
            <TouchableOpacity onPress={() => setDetailVisible(false)} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
              <Text style={{ color: '#1976D2', fontWeight: '700' }}>{t('common.ok') || 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
