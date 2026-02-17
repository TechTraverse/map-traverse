import type { MapConfig } from '@ogc-maps/storybook-components/types';

export const mapConfig: MapConfig = {
  sources: [
    {
      id: 'tipg-local',
      url: 'http://localhost:8001',
      label: 'Local tipg (Natural Earth)',
      tileMatrixSetId: 'WebMercatorQuad',
    },
  ],
  layers: [
    {
      id: 'countries',
      sourceId: 'tipg-local',
      collection: 'public.ne_110m_admin_0_countries',
      label: 'Countries',
      visible: true,
      dataMode: 'vector-tiles',
      style: {
        type: 'fill',
        paint: {
          'fill-color': '#4a90d9',
          'fill-opacity': 0.6,
          'fill-outline-color': '#2c5f8a',
        },
      },
      legend: {
        entries: [{ label: 'Countries', color: '#4a90d9', shape: 'square' }],
      },
      search: {
        fields: [
          {
            property: 'name',
            label: 'Country Name',
            type: 'text',
            placeholder: 'Enter country name...',
          },
          {
            property: 'continent',
            label: 'Continent',
            type: 'select',
            options: [
              'Africa',
              'Antarctica',
              'Asia',
              'Europe',
              'North America',
              'Oceania',
              'South America',
            ],
          },
          {
            property: 'created_at',
            label: 'Created At',
            type: 'datetime',
          },
          {
            property: 'dynamic_test',
            label: 'Dynamic Select Test',
            type: 'select',
            placeholder: 'Should fetch from API...',
          },
        ],
      },
    },
    {
      id: 'cities',
      sourceId: 'tipg-local',
      collection: 'public.ne_110m_populated_places',
      label: 'Cities',
      visible: true,
      dataMode: 'geojson',
      style: {
        type: 'circle',
        paint: {
          'circle-color': '#e74c3c',
          'circle-radius': 5,
          'circle-opacity': 0.9,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
        },
      },
      legend: {
        entries: [{ label: 'Cities', color: '#e74c3c', shape: 'circle' }],
      },
    },
    {
      id: 'rivers',
      sourceId: 'tipg-local',
      collection: 'public.ne_110m_rivers_lake_centerlines',
      label: 'Rivers',
      visible: true,
      dataMode: 'vector-tiles',
      style: {
        type: 'line',
        paint: {
          'line-color': '#00bcd4',
          'line-width': 2,
          'line-opacity': 0.8,
        },
      },
      legend: {
        entries: [{ label: 'Rivers', color: '#00bcd4', shape: 'line' }],
      },
    },
  ],
  basemaps: [
    {
      id: 'carto-positron',
      label: 'CARTO Positron',
      url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    },
    {
      id: 'carto-dark-matter',
      label: 'CARTO Dark Matter',
      url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    },
  ],
  ui: {
    showLayerPanel: true,
    showLegend: true,
    showBasemapSwitcher: true,
    showSearchPanel: true,
    showCoordinateDisplay: true,
  },
  initialView: {
    latitude: 0,
    longitude: 0,
    zoom: 2,
    pitch: 0,
    bearing: 0,
  },
};
