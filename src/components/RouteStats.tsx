"use client";

import L from "leaflet";

interface RouteStatsProps {
  route: L.Polyline | null;
  origin: [number, number] | null;
  destination: [number, number] | null;
}

export default function RouteStats({ route, origin, destination }: RouteStatsProps) {
  if (!route || !origin || !destination) return null;

  // Calculate route distance
  const latlngs = route.getLatLngs() as L.LatLng[];
  let totalDistance = 0;
  
  for (let i = 0; i < latlngs.length - 1; i++) {
    totalDistance += latlngs[i]!.distanceTo(latlngs[i + 1]!);
  }

  // Convert meters to kilometers
  const distanceKm = (totalDistance / 1000).toFixed(1);

  return (
    <div className="mt-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-100">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Route Informatie</h3>
      <div>
        <div className="text-xs text-gray-500 mb-1">Afstand</div>
        <div className="text-2xl font-bold text-blue-600">{distanceKm} km</div>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
        Route volgt alleen gestrooide wegen
      </div>
    </div>
  );
}

