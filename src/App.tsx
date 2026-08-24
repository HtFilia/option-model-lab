import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { LearnView } from './components/LearnView';

const ExploreView = lazy(() =>
  import('./components/ExploreView').then((module) => ({ default: module.ExploreView })),
);
const CalibrateView = lazy(() =>
  import('./components/CalibrateView').then((module) => ({ default: module.CalibrateView })),
);
const HestonLearnView = lazy(() =>
  import('./components/HestonLearnView').then((module) => ({ default: module.HestonLearnView })),
);
const HestonExploreView = lazy(() =>
  import('./components/HestonExploreView').then((module) => ({
    default: module.HestonExploreView,
  })),
);
const HestonCalibrateView = lazy(() =>
  import('./components/HestonCalibrateView').then((module) => ({
    default: module.HestonCalibrateView,
  })),
);
const MertonLearnView = lazy(() =>
  import('./components/MertonLearnView').then((module) => ({ default: module.MertonLearnView })),
);
const MertonExploreView = lazy(() =>
  import('./components/MertonExploreView').then((module) => ({
    default: module.MertonExploreView,
  })),
);
const MertonCalibrateView = lazy(() =>
  import('./components/MertonCalibrateView').then((module) => ({
    default: module.MertonCalibrateView,
  })),
);
const SabrLearnView = lazy(() =>
  import('./components/SabrLearnView').then((module) => ({ default: module.SabrLearnView })),
);
const SabrExploreView = lazy(() =>
  import('./components/SabrExploreView').then((module) => ({ default: module.SabrExploreView })),
);
const SabrCalibrateView = lazy(() =>
  import('./components/SabrCalibrateView').then((module) => ({
    default: module.SabrCalibrateView,
  })),
);
const LocalVolLearnView = lazy(() =>
  import('./components/LocalVolLearnView').then((module) => ({
    default: module.LocalVolLearnView,
  })),
);
const LocalVolExploreView = lazy(() =>
  import('./components/LocalVolExploreView').then((module) => ({
    default: module.LocalVolExploreView,
  })),
);
const LocalVolCalibrateView = lazy(() =>
  import('./components/LocalVolCalibrateView').then((module) => ({
    default: module.LocalVolCalibrateView,
  })),
);
const CompareView = lazy(() =>
  import('./components/CompareView').then((module) => ({ default: module.CompareView })),
);

type Mode = 'learn' | 'explore' | 'calibrate' | 'compare';
type Theme = 'dark' | 'light';
type ModelSlug = 'black-scholes' | 'heston' | 'merton-jump-diffusion' | 'sabr' | 'local-vol';

interface RouteState {
  model: ModelSlug;
  mode: Mode;
}

const modes: readonly Mode[] = ['learn', 'explore', 'calibrate', 'compare'];
const labModes: readonly Exclude<Mode, 'compare'>[] = ['learn', 'explore', 'calibrate'];
const models: readonly { slug: ModelSlug; label: string; shortLabel: string }[] = [
  { slug: 'black-scholes', label: 'Black–Scholes', shortLabel: 'BS' },
  { slug: 'heston', label: 'Heston', shortLabel: 'Heston' },
  { slug: 'merton-jump-diffusion', label: 'Merton Jump Diffusion', shortLabel: 'Merton JD' },
  { slug: 'sabr', label: 'SABR', shortLabel: 'SABR' },
  { slug: 'local-vol', label: 'Local Vol', shortLabel: 'Local Vol' },
];

function themeFromStorage(): Theme {
  return window.localStorage.getItem('option-model-lab-theme') === 'light' ? 'light' : 'dark';
}

function routeFromHash(): RouteState {
  const parts = window.location.hash.replace(/^#\/?/, '').toLowerCase().split('/');
  if (parts[0] === 'compare') {
    return { model: 'black-scholes', mode: 'compare' };
  }
  // Preserve the original Milestone 1 URLs such as #/learn and #/explore.
  if (modes.includes(parts[0] as Mode)) {
    return { model: 'black-scholes', mode: parts[0] as Mode };
  }
  const model = models.some(({ slug }) => slug === parts[0])
    ? (parts[0] as ModelSlug)
    : 'black-scholes';
  const mode = modes.includes(parts[1] as Mode) ? (parts[1] as Mode) : 'learn';
  return { model, mode };
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(routeFromHash);
  const [theme, setTheme] = useState<Theme>(themeFromStorage);
  const currentModel = models.find(({ slug }) => slug === route.model)!;

  useEffect(() => {
    const onRouteChange = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);
    return () => {
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('option-model-lab-theme', theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#1c1914' : '#f2e7d3');
  }, [theme]);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [route.model, route.mode]);

  useEffect(() => {
    const routeTitle =
      route.mode === 'compare'
        ? 'Black–Scholes vs Heston · Compare'
        : `${currentModel.label} · ${route.mode[0]?.toUpperCase()}${route.mode.slice(1)}`;
    document.title = `${routeTitle} — Option Model Lab`;
  }, [currentModel.label, route.mode]);

  function navigateMode(nextMode: Mode) {
    window.history.pushState(
      null,
      '',
      nextMode === 'compare' ? '#/compare' : `#/${route.model}/${nextMode}`,
    );
    setRoute((current) => ({ ...current, mode: nextMode }));
  }

  function navigateModel(nextModel: ModelSlug) {
    const nextMode = route.mode === 'compare' ? 'learn' : route.mode;
    window.history.pushState(null, '', `#/${nextModel}/${nextMode}`);
    setRoute({ model: nextModel, mode: nextMode });
  }

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <button className="brand" type="button" onClick={() => navigateMode('learn')}>
          <span className="brand-mark" aria-hidden="true">
            OML
          </span>
          <span>Option Model Lab</span>
        </button>
        <nav className="model-nav" aria-label="Pricing model">
          {models.map((model) => (
            <button
              type="button"
              key={model.slug}
              className={route.mode !== 'compare' && route.model === model.slug ? 'active' : ''}
              aria-current={
                route.mode !== 'compare' && route.model === model.slug ? 'page' : undefined
              }
              aria-label={model.label}
              onClick={() => navigateModel(model.slug)}
            >
              <span className="model-label-full">{model.label}</span>
              <span className="model-label-short" aria-hidden="true">
                {model.shortLabel}
              </span>
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <nav className="mode-nav" aria-label="Lab mode">
            {labModes.map((item) => (
              <button
                type="button"
                key={item}
                className={route.mode === item ? 'active' : ''}
                aria-current={route.mode === item ? 'page' : undefined}
                onClick={() => navigateMode(item)}
              >
                {item[0]?.toUpperCase()}
                {item.slice(1)}
              </button>
            ))}
          </nav>
          <button
            className={`global-compare-button ${route.mode === 'compare' ? 'active' : ''}`}
            type="button"
            aria-current={route.mode === 'compare' ? 'page' : undefined}
            aria-label="Compare Black–Scholes and Heston"
            title="Compare Black–Scholes and Heston"
            onClick={() => navigateMode('compare')}
          >
            <span className="compare-label-full">BS ↔ Heston</span>
            <span className="compare-label-short" aria-hidden="true">
              Compare
            </span>
          </button>
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <span className="theme-toggle-symbol" aria-hidden="true">
              {theme === 'dark' ? '☀' : '☾'}
            </span>
            <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>

      <Suspense
        key={`${route.model}/${route.mode}`}
        fallback={
          <main id="main-content" className="page-shell loading-page" aria-live="polite">
            <p className="eyebrow">
              {route.mode === 'compare' ? 'Black–Scholes vs Heston' : currentModel.label}
            </p>
            <p>Preparing the interactive lab…</p>
          </main>
        }
      >
        {route.mode === 'compare' ? (
          <CompareView />
        ) : route.model === 'local-vol' ? (
          route.mode === 'learn' ? (
            <LocalVolLearnView />
          ) : route.mode === 'explore' ? (
            <LocalVolExploreView />
          ) : (
            <LocalVolCalibrateView />
          )
        ) : route.model === 'sabr' ? (
          route.mode === 'learn' ? (
            <SabrLearnView />
          ) : route.mode === 'explore' ? (
            <SabrExploreView />
          ) : (
            <SabrCalibrateView />
          )
        ) : route.model === 'merton-jump-diffusion' ? (
          route.mode === 'learn' ? (
            <MertonLearnView />
          ) : route.mode === 'explore' ? (
            <MertonExploreView />
          ) : (
            <MertonCalibrateView />
          )
        ) : route.model === 'heston' ? (
          route.mode === 'learn' ? (
            <HestonLearnView />
          ) : route.mode === 'explore' ? (
            <HestonExploreView />
          ) : (
            <HestonCalibrateView />
          )
        ) : route.mode === 'learn' ? (
          <LearnView />
        ) : route.mode === 'explore' ? (
          <ExploreView />
        ) : (
          <CalibrateView />
        )}
      </Suspense>

      <footer className="site-footer">
        <span>Option Model Lab</span>
        <span>Educational model · not trading advice</span>
      </footer>
    </div>
  );
}
