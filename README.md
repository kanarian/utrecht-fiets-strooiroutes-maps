# Salt Roads Navigation

A Google Maps-like navigation app that helps people navigate from one place to another using only salted roads in Utrecht, Netherlands.

## Features

- 🗺️ Interactive map showing salted roads (strooiroutes) from Utrecht's ArcGIS service
- 🔍 Address geocoding to find locations
- 📍 Current location support
- 🧭 Route calculation using only salted roads
- 🎨 Clean, modern UI with Tailwind CSS

## Data Source

The app uses salted roads data from Utrecht's ArcGIS Feature Server:

- [Feature Server](https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer)
- Multiple layers including bike paths (Fietspaden) and other salted road routes
- Base map from [ArcGIS Online Netherlands](https://services.arcgisonline.nl/)

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [ArcGIS Maps SDK for JavaScript](https://developers.arcgis.com/javascript/) - Mapping and geospatial functionality
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

1. Enter an origin address in the search box, or click the 📍 button to use your current location
2. Enter a destination address
3. Click "Navigate via Salt Roads" to calculate a route
4. The map will display the route using only salted roads

## Project Structure

- `src/app/page.tsx` - Main page component
- `src/components/SaltyRoadsMap.tsx` - Map component with ArcGIS integration
- `src/components/NavigationPanel.tsx` - Navigation UI panel
- `src/lib/routeCalculator.ts` - Route calculation logic

## Notes

- The route calculation uses a simplified algorithm. For production use, consider integrating with a proper routing service
- The app focuses on the Utrecht area where the salted roads data is available
- Coordinate systems are automatically handled (WGS84 for display, Dutch RD for data queries)
