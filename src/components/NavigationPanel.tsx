"use client";

import { useState, useEffect, useRef } from "react";

import RouteStats from "./RouteStats";
import L from "leaflet";

interface NavigationPanelProps {
  onOriginChange: (origin: [number, number] | null) => void; // [lat, lng]
  onDestinationChange: (destination: [number, number] | null) => void; // [lat, lng]
  onRouteCalculate: (origin: [number, number], destination: [number, number]) => void;
  isCalculating: boolean;
  route: L.Polyline | null;
  origin: [number, number] | null;
  destination: [number, number] | null;
}

export default function NavigationPanel({
  onOriginChange,
  onDestinationChange,
  onRouteCalculate,
  isCalculating,
  route,
  origin,
  destination,
}: NavigationPanelProps) {
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [originPoint, setOriginPoint] = useState<[number, number] | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<[number, number] | null>(null);
  const [isGeocodingOrigin, setIsGeocodingOrigin] = useState(false);
  const [isGeocodingDestination, setIsGeocodingDestination] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState<Array<{ display: string; lat: number; lng: number }>>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Array<{ display: string; lat: number; lng: number }>>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [isLoadingOriginSuggestions, setIsLoadingOriginSuggestions] = useState(false);
  const [isLoadingDestinationSuggestions, setIsLoadingDestinationSuggestions] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const originTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const destinationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch autocomplete suggestions from Nominatim
  const fetchSuggestions = async (query: string, type: "origin" | "destination") => {
    if (query.length < 4) {
      if (type === "origin") {
        setOriginSuggestions([]);
        setShowOriginSuggestions(false);
      } else {
        setDestinationSuggestions([]);
        setShowDestinationSuggestions(false);
      }
      return;
    }

    if (type === "origin") {
      setIsLoadingOriginSuggestions(true);
    } else {
      setIsLoadingDestinationSuggestions(true);
    }

    try {
      const utrechtBounds = "4.95,52.05,5.20,52.15";
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=nl&viewbox=${utrechtBounds}&bounded=1&addressdetails=1`
      );
      const data = await response.json();

      if (data && Array.isArray(data)) {
        const suggestions = data
          .filter((result: any) => {
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            return lat >= 52.05 && lat <= 52.15 && lon >= 4.95 && lon <= 5.20;
          })
          .map((result: any) => ({
            display: result.display_name || result.name || "",
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          }));

        if (type === "origin") {
          setOriginSuggestions(suggestions);
          setShowOriginSuggestions(suggestions.length > 0);
        } else {
          setDestinationSuggestions(suggestions);
          setShowDestinationSuggestions(suggestions.length > 0);
        }
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      if (type === "origin") {
        setIsLoadingOriginSuggestions(false);
      } else {
        setIsLoadingDestinationSuggestions(false);
      }
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        originInputRef.current &&
        !originInputRef.current.contains(event.target as Node)
      ) {
        setShowOriginSuggestions(false);
      }
      if (
        destinationInputRef.current &&
        !destinationInputRef.current.contains(event.target as Node)
      ) {
        setShowDestinationSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Save address to localStorage (for history, not suggestions)
  const saveAddress = (address: string) => {
    if (typeof window !== "undefined" && address.trim()) {
      const savedAddresses = localStorage.getItem("saltyRoadsAddresses");
      let addresses: string[] = [];
      
      if (savedAddresses) {
        try {
          addresses = JSON.parse(savedAddresses) as string[];
        } catch (error) {
          console.error("Error parsing saved addresses:", error);
        }
      }
      
      // Add address if not already present
      if (!addresses.includes(address)) {
        addresses.unshift(address); // Add to beginning
        addresses = addresses.slice(0, 10); // Keep only last 10 addresses
        localStorage.setItem("saltyRoadsAddresses", JSON.stringify(addresses));
      }
    }
  };

  // Geocoding using Nominatim (OpenStreetMap) - restricted to Utrecht area
  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      // Utrecht bounding box (approximate)
      // min_lon, min_lat, max_lon, max_lat
      const utrechtBounds = "4.95,52.05,5.20,52.15";
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=nl&viewbox=${utrechtBounds}&bounded=1&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Filter results to ensure they're actually in Utrecht
        const utrechtResults = data.filter((result: any) => {
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);
          // Check if within Utrecht bounds
          return lat >= 52.05 && lat <= 52.15 && lon >= 4.95 && lon <= 5.20;
        });
        
        if (utrechtResults.length > 0) {
          const result = utrechtResults[0];
          return [parseFloat(result.lat), parseFloat(result.lon)];
        }
        
        // If no results in bounds, check if any result mentions Utrecht
        const utrechtMentioned = data.find((result: any) => {
          const address = result.address || {};
          return (
            address.city === "Utrecht" ||
            address.town === "Utrecht" ||
            address.municipality === "Utrecht" ||
            address.county === "Utrecht"
          );
        });
        
        if (utrechtMentioned) {
          return [parseFloat(utrechtMentioned.lat), parseFloat(utrechtMentioned.lon)];
        }
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const handleOriginSearch = async (address?: string, point?: [number, number]) => {
    const searchText = address || originText.trim();
    if (!searchText) {
      setOriginPoint(null);
      onOriginChange(null);
      setShowOriginSuggestions(false);
      return;
    }

    setIsGeocodingOrigin(true);
    setShowOriginSuggestions(false);
    
    let finalPoint: [number, number] | null = null;
    if (point) {
      // Use provided point directly (from autocomplete)
      finalPoint = point;
    } else {
      // Geocode the address
      finalPoint = await geocodeAddress(searchText);
    }
    
    setIsGeocodingOrigin(false);

    if (finalPoint) {
      setOriginPoint(finalPoint);
      onOriginChange(finalPoint);
      setOriginText(searchText);
      saveAddress(searchText);
    } else {
      alert("Locatie niet gevonden in Utrecht. Probeer een ander adres.");
    }
  };

  const handleDestinationSearch = async (address?: string, point?: [number, number]) => {
    const searchText = address || destinationText.trim();
    if (!searchText) {
      setDestinationPoint(null);
      onDestinationChange(null);
      setShowDestinationSuggestions(false);
      return;
    }

    setIsGeocodingDestination(true);
    
    let finalPoint: [number, number] | null = null;
    if (point) {
      finalPoint = point;
    } else {
      finalPoint = await geocodeAddress(searchText);
    }
    
    setIsGeocodingDestination(false);

    if (finalPoint) {
      setDestinationPoint(finalPoint);
      onDestinationChange(finalPoint);
      setDestinationText(searchText);
      saveAddress(searchText);
    } else {
      alert("Locatie niet gevonden in Utrecht. Probeer een ander adres.");
    }
  };

  const handleCalculateRoute = () => {
    if (originPoint && destinationPoint) {
      onRouteCalculate(originPoint, destinationPoint);
    } else {
      alert("Please set both origin and destination.");
    }
  };

  const handleUseCurrentLocation = (type: "origin" | "destination") => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const point: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];

          if (type === "origin") {
            setOriginPoint(point);
            onOriginChange(point);
            setOriginText(
              `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
            );
          } else {
            setDestinationPoint(point);
            onDestinationChange(point);
            setDestinationText(
              `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
            );
          }
        },
        (_error) => {
          alert(
            "Kon uw locatie niet ophalen. Voer handmatig een adres in.",
          );
        },
      );
    } else {
      alert("Geolocatie wordt niet ondersteund door uw browser.");
    }
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] w-80 md:w-96 lg:w-[28rem] max-w-[calc(100%-2rem)] rounded-xl bg-white shadow-2xl border border-gray-100 md:p-5 p-4">
      {/* Header with collapse button on mobile */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Fiets Strooiroutes
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Navigeer door Utrecht via alleen gestrooide wegen
          </p>
        </div>
        {/* Collapse button - only visible on mobile */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="md:hidden ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={isCollapsed ? "Uitklappen" : "Inklappen"}
        >
          {isCollapsed ? "▼" : "▲"}
        </button>
      </div>

      {/* Collapsible content - hidden on mobile when collapsed */}
      <div className={`md:block ${isCollapsed ? "hidden" : "block"}`}>
      {/* Origin Input */}
      <div className="relative mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Vertrekpunt
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={originInputRef}
              type="text"
              value={originText}
              onChange={(e) => {
                const value = e.target.value;
                setOriginText(value);
                
                // Clear previous timeout
                if (originTimeoutRef.current) {
                  clearTimeout(originTimeoutRef.current);
                }
                
                // Debounce API call after 4 characters
                if (value.length >= 4) {
                  originTimeoutRef.current = setTimeout(() => {
                    void fetchSuggestions(value, "origin");
                  }, 300); // 300ms debounce
                } else {
                  setOriginSuggestions([]);
                  setShowOriginSuggestions(false);
                }
              }}
              onFocus={() => {
                if (originSuggestions.length > 0) {
                  setShowOriginSuggestions(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowOriginSuggestions(false);
                }
              }}
              placeholder="Typ adres of klik op locatie"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {/* Suggestions dropdown */}
            {showOriginSuggestions && originSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
                {isLoadingOriginSuggestions && (
                  <div className="px-4 py-2 text-sm text-gray-500">Laden...</div>
                )}
                {originSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const point: [number, number] = [suggestion.lat, suggestion.lng];
                      // Close dropdown immediately
                      setShowOriginSuggestions(false);
                      // Set text immediately for visual feedback
                      setOriginText(suggestion.display);
                      // Set point immediately and pin on map
                      setOriginPoint(point);
                      onOriginChange(point);
                      // Save address
                      saveAddress(suggestion.display);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    {suggestion.display}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => handleUseCurrentLocation("origin")}
            className="rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 transition-colors"
            title="Gebruik huidige locatie"
          >
            Mijn locatie
          </button>
          <button
            onClick={() => void handleOriginSearch()}
            disabled={isGeocodingOrigin || !originText.trim()}
            className="rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            title="Zoek adres"
          >
            {isGeocodingOrigin ? "..." : "Zoek"}
          </button>
        </div>
      </div>

      {/* Destination Input */}
      <div className="relative mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Bestemming
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={destinationInputRef}
              type="text"
              value={destinationText}
              onChange={(e) => {
                const value = e.target.value;
                setDestinationText(value);
                
                // Clear previous timeout
                if (destinationTimeoutRef.current) {
                  clearTimeout(destinationTimeoutRef.current);
                }
                
                // Debounce API call after 4 characters
                if (value.length >= 4) {
                  destinationTimeoutRef.current = setTimeout(() => {
                    void fetchSuggestions(value, "destination");
                  }, 300); // 300ms debounce
                } else {
                  setDestinationSuggestions([]);
                  setShowDestinationSuggestions(false);
                }
              }}
              onFocus={() => {
                if (destinationSuggestions.length > 0) {
                  setShowDestinationSuggestions(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowDestinationSuggestions(false);
                }
              }}
              placeholder="Typ adres of klik op locatie"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {/* Suggestions dropdown */}
            {showDestinationSuggestions && destinationSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
                {isLoadingDestinationSuggestions && (
                  <div className="px-4 py-2 text-sm text-gray-500">Laden...</div>
                )}
                {destinationSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const point: [number, number] = [suggestion.lat, suggestion.lng];
                      // Close dropdown immediately
                      setShowDestinationSuggestions(false);
                      // Set text immediately for visual feedback
                      setDestinationText(suggestion.display);
                      // Set point immediately and pin on map
                      setDestinationPoint(point);
                      onDestinationChange(point);
                      // Save address
                      saveAddress(suggestion.display);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    {suggestion.display}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => handleUseCurrentLocation("destination")}
            className="rounded-md bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 transition-colors"
            title="Gebruik huidige locatie"
          >
            Mijn locatie
          </button>
          <button
            onClick={() => void handleDestinationSearch()}
            disabled={isGeocodingDestination || !destinationText.trim()}
            className="rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            title="Zoek adres"
          >
            {isGeocodingDestination ? "..." : "Zoek"}
          </button>
        </div>
      </div>

      {/* Calculate Route Button */}
      <button
        onClick={handleCalculateRoute}
        disabled={!originPoint || !destinationPoint || isCalculating}
        className="w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-base font-semibold text-white hover:from-green-600 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02] disabled:transform-none"
      >
        {isCalculating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Route berekenen...
          </span>
        ) : (
          "Navigeer via Fiets Strooiroutes"
        )}
      </button>

      {/* Route Statistics - hidden on mobile when collapsed */}
      <div className={`${isCollapsed ? "hidden md:block" : "block"}`}>
        <RouteStats route={route} origin={origin} destination={destination} />
      </div>

      {/* Help Text - hidden on mobile when collapsed */}
      <div className={`mt-4 rounded-lg bg-gray-50 p-3 border border-gray-200 ${isCollapsed ? "hidden md:block" : "block"}`}>
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong className="text-gray-700">Tip:</strong> Typ minimaal 4 tekens om adressuggesties te zien. Routes worden berekend met alleen gestrooide wegen die door de gemeente Utrecht worden onderhouden.
        </p>
      </div>
      </div>
    </div>
  );
}
