"use client";

import { useState } from "react";

export default function AboutPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg hover:bg-gray-50 border border-gray-200 transition-all"
        >
          Over
        </button>
      ) : (
        <div className="w-96 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto rounded-lg bg-white p-6 shadow-2xl border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Over Fiets Strooiroutes</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Sluiten"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <div>
              <p>
                Een simpele app om door Utrecht te fietsen via alleen gestrooide wegen. Typ je vertrekpunt en bestemming, 
                en de app berekent een route die alleen over wegen gaat die door de gemeente worden gestrooid.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Gegevensbron</h4>
              <p className="mb-2">
                Gestrooide wegen data komt van Utrecht's ArcGIS Feature Server:
              </p>
              <a
                href="https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-xs"
              >
                Utrecht Strooiroutes Feature Server
              </a>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Hoe het werkt</h4>
              <p>
                De app gebruikt Dijkstra's algoritme om de kortste route te vinden door het netwerk van gestrooide wegen. 
                Werkt alleen binnen Utrecht.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200 mt-4">
              <p className="text-xs text-gray-500 text-center">
                Vibe coded by{" "}
                <a
                  href="https://arian.af"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  arian.af
                </a>
                {" + "}
                <span className="font-medium">cursor</span>
                {" + "}
                <span className="font-medium">composer-1 agent</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

