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
        Es gibt keine Benutzerkonten, kein Login und keine Registrierung.
        Personenbezogene Daten werden nur verarbeitet, soweit es für den
        Betrieb der Website nötig ist (Abschnitt 4) oder Sie in die
        Reichweitenmessung eingewilligt haben (Abschnitt 5).
      </p>

      <h2>3. Speicherung in Ihrem Browser</h2>
      <p>
        Die Einkaufsliste und Ihre Entscheidung zur Reichweitenmessung werden
        ausschließlich lokal in Ihrem Browser gespeichert (localStorage) und
        nicht an uns übertragen. Beim Löschen Ihrer Browser-Daten werden sie
        ebenfalls gelöscht.
      </p>

      <h2>4. Hosting</h2>
      <p>
        Diese Website wird gehostet von Vercel Inc. (Website und Schnittstelle)
        und Railway Corp. (Datenbank). Beim Aufruf der Website werden technisch
        notwendige Daten (IP-Adresse, Zeitpunkt, Browser-Typ) vom
        Hosting-Provider verarbeitet (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      <h2>5. Reichweitenmessung mit Google Analytics (nur mit Einwilligung)</h2>
      <p>
        Wenn Sie im Hinweis „Akzeptieren“ wählen, nutzen wir Google Analytics 4
        der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4,
        Irland. Ohne Ihre Einwilligung wird Google Analytics nicht geladen und
        es werden keine Cookies gesetzt.
      </p>
      <p>
        Erfasst werden aufgerufene Seiten, Suchbegriffe, Klicks auf Angebote
        und das Hinzufügen zur Einkaufsliste, dazu Geräte- und Browserangaben
        und eine gekürzte IP-Adresse. Google setzt dafür die Cookies
        <code>_ga</code> und <code>_ga_*</code> (Speicherdauer bis zu 2 Jahre).
        Eine Übermittlung in die USA ist möglich; Google ist unter dem
        EU-US Data Privacy Framework zertifiziert.
      </p>
      <p>
        Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO,
        § 25 Abs. 1 TDDDG). Sie können sie jederzeit über
        „Cookie-Einstellungen“ unten auf jeder Seite widerrufen; die Cookies
        werden dann entfernt.
      </p>

      <h2>6. Externe Datenquellen</h2>
      <p>
        Preisdaten stammen aus den öffentlich zugänglichen Angeboten von
        rewe.de, penny.de, aldi-nord.de und kaufland.de. Produktbilder werden
        direkt von den Servern der jeweiligen Supermärkte geladen; dabei wird
        Ihre IP-Adresse an diese übertragen.
      </p>

      <h2>7. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung
        der Verarbeitung, Widerspruch und Widerruf erteilter Einwilligungen
        sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde, z. B. der
        Berliner Beauftragten für Datenschutz und Informationsfreiheit. Wenden
        Sie sich dazu an die im Impressum genannte E-Mail-Adresse.
      </p>

      <h2>8. Änderungen</h2>
      <p>
        Diese Datenschutzerklärung kann aktualisiert werden. Die aktuelle
        Version ist stets auf dieser Seite abrufbar.
      </p>
    </div>
  );
}
