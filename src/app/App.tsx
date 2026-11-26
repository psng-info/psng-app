import { ListChecks, Monitor, Moon, Presentation, Sun, Users, type LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useHrData } from '@/data/repos/hr';
import { buildPeople, hrConflict } from '@/domain/hr';
import type { ConflictFn } from '@/domain/todos';
import { AccessGate } from '@/features/access/AccessGate';
import { useHasRole } from '@/features/access/CurrentUser';
import { UserMenu } from '@/features/access/UserMenu';
import { HrView } from '@/features/hr';
import { TalksView } from '@/features/talks';
import { TodosView } from '@/features/todos';
import { cn } from '@/ui/lib/utils';
import { navigate, useHashRoute, type View } from './router';
import { useTheme, type Theme } from './theme';

const TABS: { view: View; label: string; icon: LucideIcon; hrOnly?: boolean }[] = [
  { view: 'talks', label: 'Talks', icon: Presentation },
  { view: 'todos', label: 'To-dos', icon: ListChecks },
  { view: 'kandidaten', label: 'Kandidat:innen', icon: Users, hrOnly: true },
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
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <button
        type="button"
        onClick={() => document.getElementById('inhalt')?.focus()}
        className="bg-surface text-fg sr-only z-50 rounded-md px-4 py-3 font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Zum Inhalt springen
      </button>
      <header className="glass border-line sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-2.5 px-4 py-1.5">
          <span className="border-line bg-surface inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border">
            <img src="/psng-logo.png" alt="" width={32} height={32} className="size-8" />
          </span>
          <h1 className="font-display text-base font-semibold tracking-tight">
            PSNG <span className="text-accent">Orga</span>
          </h1>

          <nav aria-label="Hauptnavigation" className="ml-6 hidden gap-1 md:flex">
            <TabLinks active={route.view} isHr={isHr} />
          </nav>

          <button
            type="button"
            onClick={() => setTheme(THEME_NEXT[theme])}
            aria-label={`${THEME_LABEL[theme]}. Wechseln`}
            title={THEME_LABEL[theme]}
            className="hover:bg-accent-soft text-muted hover:text-fg ml-auto inline-flex size-11 items-center justify-center rounded-md"
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

      <main
        id="inhalt"
        tabIndex={-1}
        className="mx-auto max-w-[1180px] px-4 pt-5 pb-10 outline-none md:pt-8"
      >
        {route.view === 'talks' && <TalksView param={route.param} />}
        {route.view === 'todos' &&
          (isHr ? <TodosWithHr param={route.param} /> : <TodosView param={route.param} />)}
        {route.view === 'kandidaten' && (isHr ? <HrView /> : <NoHrAccess />)}
      </main>
    </div>
  );
}

/**
 * To-dos mit HR-Widerspruch. Nur für die Rolle hr gemountet: nur sie darf das HR-Sheet lesen,
 * für alle anderen werden nie HR-Daten geladen. Solange sie fehlen, läuft die Ansicht ohne Prüfung.
 */
function TodosWithHr({ param }: { param: string | undefined }) {
  const hr = useHrData();
  const conflict = useMemo<ConflictFn | undefined>(() => {
    if (!hr.data) return undefined;
    const people = buildPeople(hr.data, new Date());
    return (todo) => {
      const hit = hrConflict([todo.title, todo.nextStep].join(' '), people);
      if (!hit) return null;
      return {
        label: `HR: ${hit.first} ${hit.status.toLowerCase()}`,
        reason: hit.grund
          ? `${hit.first} steht im HR-Sheet als „${hit.status}“ (${hit.grund}).`
          : `${hit.first} steht im HR-Sheet als „${hit.status}“.`,
      };
    };
  }, [hr.data]);
  return <TodosView {...(conflict ? { conflict } : {})} param={param} />;
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
      {TABS.filter((t) => isHr || !t.hrOnly).map((tab) => {
        const current = active === tab.view;
        const Icon = tab.icon;
        return (
          <a
            key={tab.view}
            href={`#/${tab.view}`}
            onClick={(e) => {
              e.preventDefault();
              navigate(tab.view);
            }}
            aria-current={current ? 'page' : undefined}
            className={cn(
              mobile
                ? 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-xs'
                : 'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm',
              current ? 'text-accent font-bold' : 'text-muted hover:text-fg font-medium',
              !mobile && current && 'bg-accent-soft',
            )}
          >
            {mobile && (
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                  current && 'bg-accent-soft',
                )}
              >
                <Icon className="size-5" strokeWidth={current ? 2.25 : 1.75} />
              </span>
            )}
            {tab.label}
          </a>
        );
      })}
    </>
  );
}
