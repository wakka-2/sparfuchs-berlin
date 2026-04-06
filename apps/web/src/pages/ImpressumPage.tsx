export function ImpressumPage() {
  return (
    <div className="prose mx-auto max-w-2xl">
      <h1>Impressum</h1>
      <p className="text-sm text-gray-500">Angaben gemäß § 5 TMG</p>

      <h2>Verantwortlich</h2>
      <p>
        [Vor- und Nachname]
        <br />
        [Straße und Hausnummer]
        <br />
        [PLZ und Ort]
        <br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: [email@example.com]
      </p>

      <h2>Haftungsausschluss</h2>
      <h3>Haftung für Inhalte</h3>
      <p>
        Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die
        Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir
        jedoch keine Gewähr übernehmen. Insbesondere die angezeigten
        Produktpreise stammen von Drittanbietern (rewe.de, lidl.de) und können
        von den tatsächlichen Preisen im Geschäft abweichen.
      </p>

      <h3>Haftung für Links</h3>
      <p>
        Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren
        Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten
        Seiten ist stets der jeweilige Anbieter verantwortlich.
      </p>

      <h2>Quellenangaben</h2>
      <p>
        Preisdaten werden von rewe.de und lidl.de bezogen und täglich
        automatisch aktualisiert. Alle Preisangaben ohne Gewähr.
      </p>
    </div>
  );
}
