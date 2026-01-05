"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import the entire map component with SSR disabled
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100" />,
});

interface SaltyRoadsMapProps {
  origin?: [number, number] | null; // [lat, lng]
  destination?: [number, number] | null; // [lat, lng]
  route?: any | null; // L.Polyline
}

export default function SaltyRoadsMap({
  origin,
  destination,
  route,
}: SaltyRoadsMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-full w-full bg-gray-100" />;
  }

  return (
    <LeafletMap origin={origin} destination={destination} route={route} />
  );
}
