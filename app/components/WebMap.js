import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

export default function WebMap({ region, markers, onMarkerPress, onRegionChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const leafletRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mounted = true;

    const init = async () => {
      const L = await import('leaflet');
      leafletRef.current = L;

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const map = L.map(containerRef.current).setView([region.latitude, region.longitude], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const layer = L.layerGroup().addTo(map);
      mapRef.current = map;
      markerLayerRef.current = layer;

      map.on('moveend', () => {
        if (!mounted) return;
        const center = map.getCenter();
        if (onRegionChange) {
          onRegionChange({ latitude: center.lat, longitude: center.lng, latitudeDelta: 18, longitudeDelta: 18 });
        }
      });
    };

    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!markerLayerRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    const layer = markerLayerRef.current;
    layer.clearLayers();

    markers.forEach(marker => {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color:${marker.color || '#4CAF50'};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([marker.latitude, marker.longitude], { icon })
        .addTo(layer)
        .on('click', () => onMarkerPress && onMarkerPress(marker));
    });
  }, [markers, onMarkerPress]);

  return <View ref={containerRef} style={{ flex: 1 }} />;
}
