export function TalksView({ param }: { param?: string | undefined }) {
  return (
    <section aria-labelledby="talks-title">
      <h2 id="talks-title" className="font-display text-2xl font-semibold">
        Talks
      </h2>
      <p className="text-muted mt-2">Kommt bald{param ? `. Gewählter Talk: ${param}` : ''}</p>
    </section>
  );
}
