import { createRoot } from 'react-dom/client';

import App from './App';
import { setBaseUrl } from '@workspace/api-client-react';

import './index.css';

const apiBaseUrl =
  import.meta.env.VITE_API_URL ||
  'https://movienet-api-server-om8520qxn-vk911tech.vercel.app';

setBaseUrl(apiBaseUrl);

createRoot(document.getElementById('root')!).render(<App />);
