import { createBrowserRouter, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BackButton } from '@/components/BackButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingScreen } from '@/components/LoadingScreen';
import { pageVariants, pageTransition } from '@/lib/motion';

// Route-based code splitting keeps the landing bundle tiny.
const Home = lazy(() => import('./screens/Home'));
const BuildPlayer = lazy(() => import('./screens/BuildPlayer'));
const Preview = lazy(() => import('./screens/Preview'));
const Simulate = lazy(() => import('./screens/Simulate'));
const Results = lazy(() => import('./screens/Results'));
const Replay = lazy(() => import('./screens/Replay'));

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<LoadingScreen />}>{node}</Suspense>;
}

/**
 * History seeding: when the app cold-starts on a deep route (e.g. a shared
 * `/r?b=…` replay link, which then `replace`s to `/results`), the browser has no
 * Home entry to go back to — the back gesture would leave the site. Insert a `/`
 * entry beneath the deep one so both the browser back button and our global Home
 * control return Home cleanly.
 *
 * Runs once at import, before the data router reads `window.location`, and only
 * for fresh deep links (`history.length <= 1`). It is a no-op for the normal
 * flow that starts at Home, so it can never disturb in-app navigation.
 */
function seedHomeHistory() {
  if (typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;
  if (pathname === '/' || window.history.length > 1) return;
  window.history.replaceState(window.history.state, '', '/');
  window.history.pushState(null, '', pathname + search + hash);
}
seedHomeHistory();

// Routes that render their own home/back affordance, or that must stay
// screenshot-clean (the Results poster), so the global Home button is suppressed.
const NO_GLOBAL_HOME = new Set(['/', '/results', '/r']);

/**
 * Root layout: animates route changes with WS2's page-transition variants and
 * mounts a single, always-available Home control on in-loop screens. Using
 * `useOutlet()` + a `location`-keyed `motion.div` lets `AnimatePresence` play the
 * exit of the leaving route before the next one enters.
 */
function RootLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const navigate = useNavigate();
  const reduced = useReducedMotion() ?? false;
  const showHome = !NO_GLOBAL_HOME.has(location.pathname);
  // Home lives on the in-progress screens (build / preview / simulate) where a
  // stray tap would throw away the current build — so confirm before leaving.
  const [confirmHome, setConfirmHome] = useState(false);

  return (
    <>
      {showHome && (
        <div className="global-home">
          <BackButton variant="home" onClick={() => setConfirmHome(true)} />
        </div>
      )}

      {confirmHome && (
        <ConfirmDialog
          title="Leave this run?"
          body="Your current player and all progress will be lost. This can’t be undone."
          confirmLabel="Leave"
          cancelLabel="Keep building"
          onConfirm={() => { setConfirmHome(false); navigate('/'); }}
          onCancel={() => setConfirmHome(false)}
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          className="page-shell"
          variants={pageVariants(reduced)}
          initial="initial"
          animate="enter"
          exit="exit"
          transition={pageTransition}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: withSuspense(<Home />) },
      { path: '/build', element: withSuspense(<BuildPlayer />) },
      { path: '/preview', element: withSuspense(<Preview />) },
      { path: '/simulate', element: withSuspense(<Simulate />) },
      { path: '/results', element: withSuspense(<Results />) },
      { path: '/r', element: withSuspense(<Replay />) },
    ],
  },
]);
