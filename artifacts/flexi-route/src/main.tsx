import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';
import './index.css';

// Wire up JWT auth: before every API request, read the token from localStorage
// so the custom-fetch layer can attach `Authorization: Bearer <token>`.
setAuthTokenGetter(() => localStorage.getItem('flexi_token'));

createRoot(document.getElementById('root')!).render(<App />);
