import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { router } from './router';
import './styles/fonts.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
    {/* Vercel Web Analytics — privacy-friendly page + event analytics (12-0.me). */}
    <Analytics />
  </StrictMode>,
);
