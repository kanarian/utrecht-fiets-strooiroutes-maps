"use client";

import { useState } from "react";
import SaltyRoadsMap from "~/components/SaltyRoadsMap";
import NavigationPanel from "~/components/NavigationPanel";
import AboutPanel from "~/components/AboutPanel";
import { calculateRoute } from "~/lib/routeCalculator";
import L from "leaflet";

export default function HomePage() {
  const [origin, setOrigin] = useState<[number, number] | null>(null); // [lat, lng]
  const [destination, setDestination] = useState<[number, number] | null>(null); // [lat, lng]
  const [route, setRoute] = useState<L.Polyline | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleRouteCalculate = async (
    originPoint: [number, number],
    destPoint: [number, number]
  ) => {
    setIsCalculating(true);
    try {
      const calculatedRoute = await calculateRoute(originPoint, destPoint);
      setRoute(calculatedRoute);
    } catch (error) {
      console.error("Route calculation error:", error);
      alert("Routeberekening mislukt. Probeer het opnieuw.");
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <main className="relative h-screen w-screen">
      <SaltyRoadsMap origin={origin} destination={destination} route={route} />
      <NavigationPanel
        onOriginChange={setOrigin}
        onDestinationChange={setDestination}
        onRouteCalculate={handleRouteCalculate}
        isCalculating={isCalculating}
        route={route}
        origin={origin}
        destination={destination}
      />
      <AboutPanel />
    </main>
  );
}
