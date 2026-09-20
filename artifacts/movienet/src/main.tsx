import { createRoot } from 'react-dom/client';

import App from './App';
import { setBaseUrl } from '@workspace/api-client-react';

import './index.css';

// Use the deployed site's same-origin Vercel function. The previous fallback
// pointed at a separate protected deployment that redirects browser requests
// to Vercel SSO, leaving movie and genre queries empty.
setBaseUrl(null);

createRoot(document.getElementById('root')!).render(<App />);
