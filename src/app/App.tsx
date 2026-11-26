import { Monitor, Moon, Sun } from 'lucide-react';
import { AccessGate } from '@/features/access/AccessGate';
import { useHasRole } from '@/features/access/CurrentUser';
import { UserMenu } from '@/features/access/UserMenu';
import { HrView } from '@/features/hr';
import { TalksView } from '@/features/talks';
import { TodosView } from '@/features/todos';
import { cn } from '@/ui/lib/utils';
import { navigate, useHashRoute, type View } from './router';
import { useTheme, type Theme } from './theme';

const TABS: { view: View; label: string; hrOnly?: boolean }[] = [
  { view: 'talks', label: 'Talks' },
  { view: 'todos', label: 'To-dos' },
  { view: 'kandidaten', label: 'Kandidat:innen', hrOnly: true },
];

const THEME_NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<Theme, string> = {
  system: 'Design: System',
  light: 'Design: Hell',
  dark: 'Design: Dunkel',
};
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

export function App() {
  return (
    <AccessGate>
      <Shell />
    </AccessGate>
  );
}

function Shell() {
  const isHr = useHasRole('hr');
  const route = useHashRoute();
  const { theme, setTheme } = useTheme();
  const ThemeIcon = THEME_ICON[theme];

  return (
    <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="glass border-line sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <img src="/psng-logo.png" alt="" width={36} height={36} className="size-9" />
          <h1 className="font-display text-lg font-semibold">PSNG Orga</h1>

          <nav aria-label="Hauptnavigation" className="ml-6 hidden gap-1 md:flex">
            <TabLinks active={route.view} isHr={isHr} />
          </nav>

          <button
            type="button"
            onClick={() => setTheme(THEME_NEXT[theme])}
            aria-label={`${THEME_LABEL[theme]}. Wechseln`}
            title={THEME_LABEL[theme]}
            className="hover:bg-accent-soft ml-auto inline-flex size-11 items-center justify-center rounded-md"
          >
            <ThemeIcon className="size-5" aria-hidden="true" />
          </button>
          <UserMenu />
        </div>
      </header>

      <nav
        aria-label="Hauptnavigation mobil"
        className="glass border-line fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <TabLinks active={route.view} isHr={isHr} mobile />
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {route.view === 'talks' && <TalksView param={route.param} />}
        {route.view === 'todos' && <TodosView />}
        {route.view === 'kandidaten' && (isHr ? <HrView /> : <NoHrAccess />)}
      </main>
    </div>
  );
}

function NoHrAccess() {
  return (
    <section aria-labelledby="nohr-title">
      <h2 id="nohr-title" className="font-display text-2xl font-semibold">
        Kandidat:innen
      </h2>
      <p className="text-muted mt-2">Dieser Bereich ist nur für die Rolle HR sichtbar.</p>
    </section>
  );
}

function TabLinks({
  active,
  isHr,
  mobile = false,
}: {
  active: View;
  isHr: boolean;
  mobile?: boolean;
}) {
  return (
    <>
      {TABS.filter((t) => isHr || !t.hrOnly).map((tab) => (
        <a
          key={tab.view}
          href={`#/${tab.view}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(tab.view);
          }}
          aria-current={active === tab.view ? 'page' : undefined}
          className={cn(
            'inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium',
            mobile && 'flex-1 rounded-none py-3',
            active === tab.view ? 'text-accent bg-accent-soft font-bold' : 'text-muted',
          )}
        >
          {tab.label}
        </a>
      ))}
    </>
  );
}
