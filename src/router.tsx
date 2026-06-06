import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Route-based code splitting keeps the landing bundle tiny.
const Home = lazy(() => import('./screens/Home'));
const BuildPlayer = lazy(() => import('./screens/BuildPlayer'));
const Preview = lazy(() => import('./screens/Preview'));
const Simulate = lazy(() => import('./screens/Simulate'));
const Results = lazy(() => import('./screens/Results'));

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={null}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: withSuspense(<Home />) },
  { path: '/build', element: withSuspense(<BuildPlayer />) },
  { path: '/preview', element: withSuspense(<Preview />) },
  { path: '/simulate', element: withSuspense(<Simulate />) },
  { path: '/results', element: withSuspense(<Results />) },
]);
