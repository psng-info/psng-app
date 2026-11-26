import { parseDate } from '@/domain/dates';
import { progress, STEPS, type Person } from '@/domain/hr';
import { DateText } from './parts';

function grundOf(p: Person): string {
  const k = p.k;
  return (
    k['Grund'] ||
    (k['Pipeline-Status'] ?? '').replace(/^Abgebrochen\s*/i, '') ||
    k['Review / Ergebnis'] ||
    '–'
  );
}

/** Abgebrochene: Name, Grund, Datum, Stand. Auf dem Handy als gestapelte Zeilen. */
export function AbortedList({ people, today }: { people: Person[]; today: Date }) {
  return (
    <table className="block w-full text-left text-sm md:table">
      <thead className="sr-only md:not-sr-only md:table-header-group">
        <tr className="text-muted border-line md:border-b">
          <th scope="col" className="py-2 pr-3 font-medium">
            Name
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Grund
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            Datum
          </th>
          <th scope="col" className="py-2 font-medium">
            Stand
          </th>
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {people.map((p) => {
          const g = progress(p);
          return (
            <tr
              key={p.key}
              className="border-line bg-surface mb-2 block rounded-lg border p-3 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-b md:bg-transparent md:p-0"
            >
              <td className="font-display block font-semibold md:table-cell md:py-2 md:pr-3">
                {p.name}
              </td>
              <td className="block md:table-cell md:py-2 md:pr-3">
                <span className="text-muted md:hidden">Grund: </span>
                {grundOf(p)}
              </td>
              <td className="block md:table-cell md:py-2 md:pr-3">
                <span className="text-muted md:hidden">Datum: </span>
                <DateText d={p.last ?? parseDate(p.k['Letzter Kontakt'])} today={today} />
              </td>
              <td className="block md:table-cell md:py-2">
                <span className="text-muted md:hidden">Stand: </span>
                {g.step >= 0 ? STEPS[g.step]?.text : 'Erstkontakt'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
