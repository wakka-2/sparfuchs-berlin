export function DatenschutzPage() {
  return (
    <div className="prose mx-auto max-w-2xl">
      <h1>Datenschutzerklärung</h1>

      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website ist der im
        Impressum genannte Betreiber.
      </p>

      <h2>2. Erhebung und Verarbeitung personenbezogener Daten</h2>
      <p>
        Diese Website erhebt und speichert <strong>keine personenbezogenen Daten</strong>.
        Es gibt keine Benutzerkonten, kein Login und keine Registrierung.
      </p>

      <h2>3. Einkaufsliste</h2>
      <p>
        Die Einkaufsliste wird ausschließlich lokal in Ihrem Browser
        gespeichert (localStorage). Es werden keine Daten an unsere Server
        übertragen. Beim Löschen Ihrer Browser-Daten wird auch die
        Einkaufsliste gelöscht.
      </p>

      <h2>4. Hosting</h2>
      <p>
        Diese Website wird gehostet von Vercel Inc. (Frontend) und Railway Corp.
        (Backend). Die Server befinden sich in der EU. Beim Aufruf der Website
        werden technisch notwendige Daten (IP-Adresse, Zeitpunkt, Browser-Typ)
        vom Hosting-Provider verarbeitet.
      </p>

      <h2>5. Cookies</h2>
      <p>
        Diese Website verwendet <strong>keine Cookies</strong> und keine
        Tracking-Technologien. Es werden keine Analyse-Tools eingesetzt.
      </p>

      <h2>6. Externe Datenquellen</h2>
      <p>
        Preisdaten werden von rewe.de und lidl.de bezogen. Beim Laden von
        Produktbildern kann eine Verbindung zu den Servern der jeweiligen
        Supermärkte hergestellt werden.
      </p>

      <h2>7. Ihre Rechte</h2>
      <p>
        Da keine personenbezogenen Daten gespeichert werden, entfallen die
        üblichen Betroffenenrechte (Auskunft, Löschung, etc.) weitgehend.
        Bei Fragen wenden Sie sich an die im Impressum genannte E-Mail-Adresse.
      </p>

      <h2>8. Änderungen</h2>
      <p>
        Diese Datenschutzerklärung kann aktualisiert werden. Die aktuelle
        Version ist stets auf dieser Seite abrufbar.
      </p>
    </div>
  );
}
