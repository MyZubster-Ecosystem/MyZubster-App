import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { listSkills } from '../services/skillService';

const DEFAULT_REGION = { latitude: 41.9028, longitude: 12.4964, latitudeDelta: 18, longitudeDelta: 18 };

function coordinates(skill) {
  const location = skill.location || skill.coordinates || skill.seller?.location || {};
  const latitude = Number(skill.latitude ?? location.latitude ?? location.lat);
  const longitude = Number(skill.longitude ?? location.longitude ?? location.lng ?? location.lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

export default function MapScreen({ navigation }) {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [skills, setSkills] = useState([]);
  const [category, setCategory] = useState('all');
  const [radiusKm, setRadiusKm] = useState('25');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);

  const load = useCallback(async (nextRegion = region) => {
    setLoading(true);
    try {
      const data = await listSkills({ category, radiusKm: Number(radiusKm), latitude: nextRegion.latitude, longitude: nextRegion.longitude });
      setSkills(data);
    } catch (error) { Alert.alert('Mappa', error.response?.data?.error || error.message || 'Impossibile caricare le competenze.'); }
    finally { setLoading(false); }
  }, [category, radiusKm, region]);

  useEffect(() => {
    (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { setLocationDenied(true); await load(DEFAULT_REGION); return; }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { ...region, latitude: position.coords.latitude, longitude: position.coords.longitude };
      setRegion(next); await load(next);
    })().catch(() => load(DEFAULT_REGION));
  // Load once on mount; filter changes are handled by the explicit button.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markers = useMemo(() => skills.map(skill => ({ skill, point: coordinates(skill) })).filter(item => item.point), [skills]);
  const focusUser = async () => {
    try { const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); const next = { ...region, latitude: p.coords.latitude, longitude: p.coords.longitude }; setRegion(next); }
    catch { Alert.alert('Posizione', 'Impossibile ottenere la posizione corrente.'); }
  };

  return <View style={styles.container}>
    <View style={styles.toolbar}>
      <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹ Indietro</Text></TouchableOpacity>
      <Text style={styles.title}>Mappa competenze</Text>
      <View style={styles.mapActions}>
        <TouchableOpacity style={styles.mapAction} onPress={() => navigation.navigate('UrbanReport')}><Text style={styles.mapActionText}>Segnala problema</Text></TouchableOpacity>
        <TouchableOpacity style={styles.mapActionSecondary} onPress={() => navigation.navigate('MunicipalReports')}><Text style={styles.mapActionSecondaryText}>Dashboard comune</Text></TouchableOpacity>
      </View>
    </View>
    <View style={styles.filters}><TextInput style={styles.filterInput} placeholder="Categoria (all)" value={category} onChangeText={setCategory} autoCapitalize="none" /><TextInput style={styles.radiusInput} placeholder="km" value={radiusKm} onChangeText={setRadiusKm} keyboardType="numeric" /><TouchableOpacity style={styles.filterButton} onPress={() => load()}><Text style={styles.filterText}>Filtra</Text></TouchableOpacity></View>
    {locationDenied && <Text style={styles.warning}>Posizione negata: visualizzazione centrata su Roma. Puoi comunque esplorare le offerte.</Text>}
    <MapView style={styles.map} initialRegion={region} region={region} onRegionChangeComplete={setRegion} showsUserLocation={!locationDenied}>
      {markers.map(({ skill, point }) => <Marker key={String(skill.id || skill._id || `${point.latitude}:${point.longitude}`)} coordinate={point} title={skill.title || skill.name || 'Competenza'} description={`${skill.category || ''} · ${skill.price || ''} ${skill.currency || 'USD'}`} onPress={() => setSelected(skill)} />)}
    </MapView>
    <TouchableOpacity style={styles.locate} onPress={focusUser}><Text style={styles.locateText}>◎</Text></TouchableOpacity>
    {loading && <View style={styles.loading}><ActivityIndicator color="#4CAF50" /><Text>Caricamento offerte…</Text></View>}
    {selected && <View style={styles.detail}><TouchableOpacity onPress={() => setSelected(null)}><Text style={styles.close}>×</Text></TouchableOpacity><Text style={styles.detailTitle}>{selected.title || selected.name || 'Competenza'}</Text><Text>{selected.description || 'Nessuna descrizione'}</Text><Text style={styles.price}>{selected.price || '—'} {selected.currency || 'USD'}</Text><View style={styles.detailActions}><TouchableOpacity style={styles.primary} onPress={() => navigation.navigate('CreateOrder', { skill: selected, skillId: selected.id || selected._id })}><Text style={styles.primaryText}>Crea ordine</Text></TouchableOpacity>{(selected.sellerId || selected.seller_id || selected.professionalId || selected.seller?.id) && <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('Reviews', { targetId: selected.sellerId || selected.seller_id || selected.professionalId || selected.seller.id, title: 'Reputazione venditore' })}><Text style={styles.secondaryText}>Recensioni</Text></TouchableOpacity>}</View></View>}
    {!loading && skills.length === 0 && <View style={styles.empty}><Text>Nessuna offerta nella zona o con questo filtro.</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' }, toolbar: { padding: 16, paddingBottom: 8 }, back: { color: '#1976D2', fontSize: 16 }, title: { fontSize: 24, fontWeight: '700', marginTop: 8 }, mapActions: { flexDirection: 'row', gap: 8, marginTop: 12 }, mapAction: { flex: 1, backgroundColor: '#2e7d32', borderRadius: 8, padding: 10, alignItems: 'center' }, mapActionText: { color: 'white', fontWeight: '700' }, mapActionSecondary: { flex: 1, borderWidth: 1, borderColor: '#2e7d32', borderRadius: 8, padding: 10, alignItems: 'center', backgroundColor: 'white' }, mapActionSecondaryText: { color: '#2e7d32', fontWeight: '700' }, filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 }, filterInput: { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 }, radiusInput: { width: 58, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 }, filterButton: { backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' }, filterText: { color: 'white', fontWeight: '700' }, warning: { paddingHorizontal: 16, color: '#9a6300', marginBottom: 6 }, map: { flex: 1 }, locate: { position: 'absolute', right: 16, top: 190, backgroundColor: 'white', borderRadius: 24, padding: 10, elevation: 3 }, locateText: { fontSize: 24, color: '#1976D2' }, loading: { position: 'absolute', top: 150, alignSelf: 'center', flexDirection: 'row', gap: 8, backgroundColor: 'white', borderRadius: 8, padding: 10 }, detail: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: 'white', borderRadius: 12, padding: 16, elevation: 5 }, close: { position: 'absolute', right: 14, top: 8, fontSize: 24, color: '#666' }, detailTitle: { fontSize: 18, fontWeight: '700', marginBottom: 5 }, price: { fontWeight: '700', marginTop: 8 }, detailActions: { flexDirection: 'row', gap: 8 }, primary: { flex: 1, backgroundColor: '#4CAF50', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 }, secondary: { flex: 1, borderWidth: 1, borderColor: '#4CAF50', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 }, secondaryText: { color: '#2e7d32', fontWeight: '700' }, primaryText: { color: 'white', fontWeight: '700' }, empty: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: 'white', padding: 10, borderRadius: 8 },
});
