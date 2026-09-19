import { createRoot } from 'react-dom/client';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';
import './index.css';

// Point the API client at a remote API server when VITE_API_URL is set at
// build time (e.g. Railway: VITE_API_URL=https://your-api.up.railway.app).
// Leave unset when the frontend is served from the same origin as the API.
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL as string);
}

// Wire up JWT auth: before every API request, read the token from localStorage
// so the custom-fetch layer can attach `Authorization: Bearer <token>`.
setAuthTokenGetter(() => localStorage.getItem('flexi_token'));

createRoot(document.getElementById('root')!).render(<App />);
