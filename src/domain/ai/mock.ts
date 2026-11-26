import { addDays, formatDate, formatShort, parseDate } from '@/domain/dates';
import { emptyPlan, type AiPlan, type AiRequest } from './plan';

/**
 * Deterministischer Ersatz für Claude im Demo-Modus (Tests, Vorschauen). Kein Netzwerk.
 * Regeln: „erledigt/fertig“ im Text hakt ein To-do ab, sonst wird die Info als Notiz angehängt;
 * „Zoom“ bei einem Talk setzt den Schritt Raum/Zoom auf erledigt; freie Einträge werden neue To-dos,
 * außer sie beginnen mit einer To-do-ID (dann Notiz dort). Ergänzungen: „Prio A“ setzt Prio A mit Deadline in 7 Tagen,
 * „keine neuen“ lässt neue To-dos weg.
 */
export function mockPlan(req: AiRequest): AiPlan {
  const plan = emptyPlan();
  const today = parseDate(req.today) ?? new Date();
  const stamp = formatShort(today, today);
  const line = (text: string): string => `${stamp}: ${text}`;
  const append = (old: string | undefined, text: string): string =>
    old?.trim() ? `${old.trim()}\n${line(text)}` : line(text);

  for (const n of req.todos) {
    const cur = req.context.todos.find((t) => t['ID'] === n.id);
    const set: Record<string, string> = {};
    if (/erledigt|fertig/i.test(n.note)) {
      set['Status'] = 'erledigt';
      set['Erledigt'] = formatDate(today);
    }
    set['Notiz'] = append(cur?.['Notiz'], n.note);
    plan.todo.push({ id: n.id, set, why: 'Info aus der Vormerkung' });
  }
  for (const n of req.people) {
    const cur = req.context.people.find((p) => p['key'] === n.key);
    plan.hr.push({
      key: n.key,
      set: { Kommentar: append(cur?.['Kommentar'], n.note) },
      why: 'Info aus der Vormerkung',
    });
  }
  for (const n of req.talks) {
    const cur = req.context.talks.find((t) => t['key'] === n.key);
    plan.talk.push({
      key: n.key,
      set: { Notizen: append(cur?.['Notizen'], n.note) },
      why: 'Info aus der Vormerkung',
    });
    if (/zoom/i.test(n.note)) {
      plan.steps.push({
        key: n.key,
        step: 'Raum/Zoom',
        status: 'erledigt',
        owner: '',
        note: '',
        why: 'Zoom erwähnt',
      });
    }
  }
  const prioA = req.extra.some((e) => /prio a/i.test(e));
  const noNew = req.extra.some((e) => /keine neuen/i.test(e));
  for (const text of req.free) {
    const id = /^(T\d+)\b\s*[:,-]?\s*(.*)$/.exec(text);
    if (id?.[1] && req.context.openTodos.some((t) => t['ID'] === id[1])) {
      const cur = plan.todo.find((t) => t.id === id[1]);
      if (!cur)
        plan.todo.push({
          id: id[1],
          set: { Notiz: line(id[2] ?? text) },
          why: 'Per ID zugeordnet',
        });
      continue;
    }
    if (noNew) continue;
    plan.new.push({
      set: {
        'To-do': text,
        Status: 'offen',
        Ebene: 'Schritt',
        Modus: 'selbst',
        Prio: prioA ? 'A' : 'B',
        ...(prioA ? { Deadline: formatDate(addDays(today, 7)) } : {}),
      },
      why: 'Freie Eingabe',
    });
  }
  return plan;
}
