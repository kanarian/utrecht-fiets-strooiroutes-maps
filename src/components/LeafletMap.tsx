"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

interface LeafletMapProps {
  origin?: [number, number] | null; // [lat, lng]
  destination?: [number, number] | null; // [lat, lng]
  route?: L.Polyline | null;
}

// Component to fit map bounds when route changes
function MapUpdater({ origin, destination, route }: LeafletMapProps) {
  const map = useMap();

  useEffect(() => {
    if (route) {
      map.fitBounds(route.getBounds(), { padding: [50, 50] });
    } else if (origin && destination) {
      const bounds = L.latLngBounds([origin, destination]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (origin) {
      map.setView(origin, 15);
    } else if (destination) {
      map.setView(destination, 15);
    }
  }, [map, origin, destination, route]);

  return null;
}

export default function LeafletMap({
  origin,
  destination,
  route,
}: LeafletMapProps) {
  const [saltyRoadsData, setSaltyRoadsData] = useState<any[]>([]);

  // Load salted roads data from ArcGIS Feature Server
  useEffect(() => {
    const loadSaltyRoads = async () => {
      try {
        const layers = [
          "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer/0",
          "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer/1",
          "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer/2",
          "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer/3",
        ];

        const allFeatures: any[] = [];

        for (const layerUrl of layers) {
          try {
            // Fetch all features with pagination
            let hasMore = true;
            let offset = 0;
            const pageSize = 1000; // Server seems to limit to 1000, so use that
            let layerFeatures: any[] = [];
            let consecutiveEmptyPages = 0;

            while (hasMore) {
              const queryUrl = `${layerUrl}/query?f=geojson&where=1=1&outSR=4326&outFields=*&resultOffset=${offset}&resultRecordCount=${pageSize}&returnGeometry=true&geometryPrecision=6`;

              const response = await fetch(queryUrl);
              const data = await response.json();

              if (data.error) {
                console.error(`API error for ${layerUrl}:`, data.error);
                hasMore = false;
                break;
              }

              if (data.features && data.features.length > 0) {
                layerFeatures.push(...data.features);
                const fetchedCount = data.features.length;
                offset += fetchedCount;
                consecutiveEmptyPages = 0;

                console.log(
                  `  Page: offset=${offset - fetchedCount}, fetched=${fetchedCount}, total=${layerFeatures.length}, exceededTransferLimit=${data.exceededTransferLimit}`,
                );

                // Continue if we got a full page (1000) - this means there might be more
                // Stop if we got fewer than pageSize (means we've reached the end)
                hasMore = fetchedCount >= pageSize;
              } else {
                consecutiveEmptyPages++;
                // Stop if we get 2 empty pages in a row (safety check)
                hasMore = consecutiveEmptyPages < 2;
              }
            }

            console.log(
              `Loaded ${layerFeatures.length} features from layer ${layerUrl}`,
            );
            allFeatures.push(...layerFeatures);
          } catch (error) {
            console.error(`Error loading layer ${layerUrl}:`, error);
          }
        }

        console.log(`Total features loaded: ${allFeatures.length}`);

        // Filter out any invalid features and ensure geometry is present
        const validFeatures = allFeatures.filter((feature) => {
          return feature && feature.geometry && feature.geometry.coordinates;
        });

        console.log(`Valid features: ${validFeatures.length}`);
        setSaltyRoadsData(validFeatures);
      } catch (error) {
        console.error("Error loading salted roads:", error);
      }
    };

    void loadSaltyRoads();
  }, []);

  // Utrecht, Netherlands coordinates
  const center: [number, number] = [52.0907, 5.1214];

  return (
    <MapContainer
      center={center}
      zoom={12}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      {/* Base map - OpenStreetMap */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Salted roads layers - combine into FeatureCollection for better performance */}
      {saltyRoadsData.length > 0 && (
        <GeoJSON
          key={`all-salty-roads-${saltyRoadsData.length}`}
          data={
            {
              type: "FeatureCollection",
              features: saltyRoadsData,
            } as any
          }
          style={{
            color: "#0064ff",
            weight: 3,
            opacity: 0.8,
          }}
        />
      )}

      {/* Route line */}
      {route && (
        <GeoJSON
          data={route.toGeoJSON() as any}
          style={{
            color: "#00ff00", // Green color
            weight: 6,
            opacity: 0.9,
            dashArray: "20", // Dashed line pattern with more spacing
          }}
        />
      )}

      {/* Origin marker */}
      {origin && (
        <Marker position={origin}>
          <Popup>Vertrekpunt</Popup>
        </Marker>
      )}

      {/* Destination marker */}
      {destination && (
        <Marker position={destination}>
          <Popup>Bestemming</Popup>
        </Marker>
      )}

      {/* Map updater component */}
      <MapUpdater origin={origin} destination={destination} route={route} />
    </MapContainer>
  );
}
