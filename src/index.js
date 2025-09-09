import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';
import { inject } from '@vercel/analytics';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SpeedInsights } from "@vercel/speed-insights/react"

inject(); // Enable Vercel Analytics

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

ReactDOM.render(
  <React.StrictMode>
    <SpeedInsights/>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
