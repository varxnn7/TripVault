import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { geocodeCity } from '../../utils/weatherUtils';
import Modal from '../ui/Modal';
import Loader from '../ui/Loader';
import './TripMap.css';

const TripMap = ({ destination, isOpen, onClose }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!isOpen || !destination) return;

    const fetchCoords = async () => {
      setLoading(true);
      setError(null);
      try {
        const geo = await geocodeCity(destination);
        setCoords(geo);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to locate destination on map.');
        setLoading(false);
      }
    };

    fetchCoords();
  }, [destination, isOpen]);

  useEffect(() => {
    if (!coords || !isOpen || !mapContainerRef.current) return;

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView([coords.latitude, coords.longitude], 12);

    mapInstanceRef.current = map;

    // Custom zoom control location matching app elements
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Standard OpenStreetMap tiles with custom dark filters applied in CSS
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Custom modern pulse marker to avoid Vite relative icon issues & look futuristic
    const customIcon = L.divIcon({
      className: 'modern-map-marker',
      html: `
        <div class="marker-container">
          <div class="marker-pulse"></div>
          <div class="marker-glow"></div>
          <div class="marker-dot"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = L.marker([coords.latitude, coords.longitude], { icon: customIcon }).addTo(map);
    
    // Popup message
    marker.bindPopup(`
      <div class="map-popup-card">
        <h4>${coords.name}</h4>
        <p>${coords.country || 'Destination'}</p>
      </div>
    `).openPopup();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [coords, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Location Map: ${destination}`} size="lg">
      <div className="trip-map-modal-content">
        {loading && (
          <div className="map-loader-container">
            <Loader text={`Locating ${destination}...`} />
          </div>
        )}

        {error && (
          <div className="map-error-container">
            <span className="map-error-emoji">🗺️</span>
            <p className="map-error-text">{error}</p>
            <button className="map-retry-btn" onClick={() => {
              setLoading(true);
              setError(null);
              geocodeCity(destination)
                .then(setCoords)
                .catch(err => setError(err.message || 'Failed to locate destination.'))
                .finally(() => setLoading(false));
            }}>Retry</button>
          </div>
        )}

        {!loading && !error && (
          <div className="map-wrapper">
            <div ref={mapContainerRef} className="map-leaflet-element" />
            <div className="map-coordinates-badge">
              <span>{coords?.name} • Lat: {coords?.latitude.toFixed(4)}° | Lon: {coords?.longitude.toFixed(4)}°</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TripMap;
