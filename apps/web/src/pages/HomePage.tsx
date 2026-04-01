export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-green-50 p-8 text-center">
        <h1 className="text-3xl font-bold text-green-800">
          Supermarkt-Preise vergleichen
        </h1>
        <p className="mt-2 text-gray-600">
          Finde die günstigsten Preise für Lebensmittel in Berlin — REWE, Lidl
          und mehr.
        </p>
        <div className="mx-auto mt-6 max-w-md">
          <input
            type="search"
            placeholder="Produkt suchen... z.B. Milch, Butter"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Kategorien</h2>
        <p className="text-gray-500">
          Produkte werden geladen...
        </p>
      </section>
    </div>
  );
}
