import { LogOut } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useCurrentUser } from './CurrentUser';

/** Name und „Abmelden“ in der Kopfzeile. Im Demo-Modus nur der Hinweis. */
export function UserMenu() {
  const { name } = useCurrentUser();
  const { isDemo, signOut } = useAuth();
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted hidden max-w-32 truncate text-sm sm:inline" title={name}>
        {isDemo ? 'Demo-Modus' : name}
      </span>
      {!isDemo && (
        <button
          type="button"
          onClick={() => void signOut()}
          aria-label={`Abmelden (${name})`}
          title="Abmelden"
          className="hover:bg-accent-soft inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium"
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Abmelden</span>
        </button>
      )}
    </div>
  );
}
