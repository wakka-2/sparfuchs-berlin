/**
 * Which store offer counts as which catalog product.
 *
 * The previous fuzzy word-overlap matcher put "Damen-Spaghettiträgerhemden"
 * under Spaghetti and strawberry jam under Zucker. These rules are explicit
 * instead: an offer belongs to a product only when its name matches `include`
 * and does not match `exclude`. Among all matching offers in a store, the one
 * with the lowest unit price (per kg / L / piece) is shown.
 *
 * Keys are the catalog's products.name_de. Patterns test the offer name in
 * lower case. Adding a product: seed it, then add a rule here.
 */
import type { Offer } from "./types.js";
import { unitPrice, type UnitKind } from "./units.js";

export interface CatalogRule {
  unit: UnitKind;
  /**
   * Plausible price per unit in euros, wide enough for organic and brand
   * goods. A match outside it is held for review instead of being shown —
   * it is almost always the wrong product (spray cream as "Sahne").
   */
  range: [number, number];
  include: RegExp;
  /** Tested against the name and the pack size, so "Glas" or "Dose" there count */
  exclude?: RegExp;
  /** Sold by weight in some stores and by volume in others; 1 kg ≈ 1 L is close enough */
  kgOrL?: true;
  /** What this product means when stricter than everyday use; told to the AI classifier and judge */
  note?: string;
}

// Processed / flavoured variants that disqualify most fresh staples.
const PROCESSED = /chips|snack|saft|smoothie|getrocknet|konfitüre|marmelade|aufstrich|riegel|kuchen|torte|eis\b|joghurt|quark|drink|sirup|likör|tee\b|bonbon|gummi|schoko|creme|soße|sauce|dressing|püree|mark\b|ketchup|pesto|chutney|pizza|salat(?!kopf)|suppe|fertig|gratin|pommes|kroketten|rösti|puffer|knödel|nudel|brot\b|würfel|pulver|dose|konserve/;

export const CATALOG: Record<string, CatalogRule> = {
  // Dairy
  "Vollmilch 3,5%": { unit: "L", range: [0.6, 2.5], include: /milch\b/, exclude: /fettarm|minus l|alpenmilch|heujuwel|1[,.]5|0[,.]\d\s*%|laktosefrei|hafer|soja|mandel|kokos|reis|schoko|kakao|kaffee|pudding|joghurt|reis\b|mix|shake|kondens|dosen|milchschnitte|kinder|brötchen|brot|schokolade|riegel|eis|creme|seife|dusch|lotion|milchreis|buttermilch|sauermilch|vollmilch-?schoko/ },
  "Fettarme Milch 1,5%": { unit: "L", range: [0.6, 2.5], include: /(fettarm|1[,.]5\s*%).*milch|milch.*(fettarm|1[,.]5\s*%)/, exclude: /laktosefrei|kakao|schoko|kaffee|shake|joghurt/ },
  "Butter": { unit: "kg", range: [3, 16], include: /butter\b|(marken|süßrahm|sauerrahm|irische|alm|weide)butter|^kerrygold/, exclude: /kräuter|knoblauch|keks|spekulatius|gebäck|kuchen|käse|brezel|croissant|stollen|schmalz|erdnuss|milch|toast|zopf|streusel|cookies|plätzchen|reinfett|butterkäse|schmelz|aufstrich|streichzart|margarine|halbfett|joghurt/ },
  "Gouda geschnitten": { unit: "kg", range: [4, 25], include: /gouda/, exclude: /gerieben|reibe|snack|würfel|sticks|chips/ },
  "Mozzarella": { unit: "kg", range: [3, 20], include: /mozzarella/, exclude: /gerieben|sticks|snack|pizza|backfrisch|wagner|salat|tomate.*mozzarella|bites|minis?\b|panier/ },
  "Naturjoghurt": { unit: "kg", range: [1, 8], include: /(natur|nature)[- ]?joghurt|joghurt\s*(natur|mild|nature)|naturjoghurt/, exclude: /griech|frucht|drink|erdbeer|vanille|schoko|kirsch/ },
  "Griechischer Joghurt": { unit: "kg", range: [1.2, 12], include: /griech\w*.*joghurt|joghurt.*griech/, exclude: /frucht|honig|drink|erdbeer|vanille|schoko/ },
  "Sahne": { note: "cream for whipping or cooking; not spray cream in cans, sour cream, Schmand or cream cheese", unit: "L", range: [2, 8], kgOrL: true, include: /schlagsahne|(^|\s)sahne\b|kochsahne|schlagrahm/, exclude: /sprüh|saure|laktosefrei|dose|eis|kiri|käse|torte|joghurt|pudding|likör|soße|sauce|creme|bonbon|schoko|karamell|toffee|meerrettich|hering|fisch|kartoffel|gratin|kuchen|kaffee|tee\b|landliebe.*pudding/ },
  "Frischkäse": { note: "cream cheese in any flavour; not cottage cheese (körniger Frischkäse) or dips", unit: "kg", range: [3, 25], include: /frischkäse|(^|\s)philadelphia\b|(^|\s)bresso\b|almette|exquisa/, exclude: /körnig|torte|kuchen|bagel|wrap|dip|snack|röllchen|füllung|pute|lachs|schinken|teigtasche/ },
  // Bread & bakery
  "Toastbrot": { unit: "kg", range: [1, 8], include: /toast(brot)?\b|sandwich(brot|scheiben)/, exclude: /toaster|käse|schinken|aufstrich|ofen|gerät|halter/ },
  "Vollkornbrot": { unit: "kg", range: [1.2, 10], include: /vollkorn(brot|schnitten)?\b|vollkorn-?brot|roggenvollkorn|pumpernickel/, exclude: /wrap|wasa|nudel|reis|mehl|toast|keks|cracker|knäcke|müsli|flocken|spaghetti|penne|fusilli|haferflocken|brötchen/ },
  "Brötchen (Aufback)": { note: "packs of bake-off rolls or pretzels; not single fresh rolls", unit: "Stück", range: [0.08, 1], include: /aufback|brötchen|baguette|ciabatta|laugen|semmel|weltmeister|kaiser/, exclude: /\s(je )?stück$|kaiserfleisch|bistro|schokobrötchen|milchbrötchen|toast|gerät|korb|chips|torte|kuchen|croissant|burger|hot ?dog|pizza|brezel(chips)?/ },
  // Fresh from the in-store bakery: sold singly ("Stück") or as a loaf ("750-g-Stück"), never in a pack.
  "Brötchen vom Bäcker": { note: "single fresh roll from the in-store bakery; not packs of bake-off rolls", unit: "Stück", range: [0.1, 1.2], include: /brötchen|schrippe|semmel/, exclude: /pack|beutel|\d\s*st\b|schoko|milch|toast|burger|hot ?dog|pizza|croissant|aufback/ },
  "Brot vom Bäcker": { note: "fresh loaf from the in-store bakery sold by the piece; not packaged bread", unit: "kg", range: [1, 10], include: /krustenbrot|landbrot|bauernbrot|mischbrot|weißbrot|sauerteigbrot|schweizer kruste|dinkelbrot|weltmeisterbrot|roggenbrot|kartoffelbrot/, exclude: /pack|beutel|walnuss|marzipan|knäcke|toast|protein|glutenfrei|schnitte|baguette|ofenbrot|snack|chips|aufstrich|brötchen/ },
  // Meat & deli
  "Hähnchenbrust": { note: "raw chicken breast fillet; not breaded, cooked or sliced cold cuts", unit: "kg", range: [5, 25], include: /hähnchen\w*brust|hähnchen\w*filet|hähnchen-?innenfilet|chicken\s*(breast|brust)/, exclude: /gebacken|nugget|wings|schenkel|keule|panier|crispy|strips|döner|wurst|aufschnitt|salami|gyros|geschnetzel(?!t\b)|cordon|schnitzel|teriyaki|curry|gegrillt|gebraten|aufschn|snack/ },
  "Hackfleisch gemischt": { unit: "kg", range: [4, 16], include: /gemischt\w*\s*hack|hack\w*\s*gemischt|hackfleisch.*(rind.*schwein|schwein.*rind)|gemischtes hackfleisch/, exclude: /bällchen|frikadell|burger|cevapcici|lasagne|bolognese|soße|sauce/ },
  "Salami": { unit: "kg", range: [6, 40], include: /salami/, exclude: /vegan|wagner|big city|pizza|snack|sticks|baguette|brötchen|chips|minis?\b|cracker|teigtasche|ciabatta|toast|bites|schnitten/ },
  "Kochschinken": { unit: "kg", range: [5, 35], include: /koch\w*schinken|schinken\w*\s*gekocht|hinterschinken|delikatess\w*\s*schinken|saftschinken|meisterschinken|formvorderschinken|vorderschinken/, exclude: /roh|serrano|parma|schwarzwälder|katenschinken|nudel|pizza|toast|wurst|baguette|croissant|salat|käse-schinken|schinkenwürfel|würfel|röllchen/ },
  // Fruit
  "Bananen": { unit: "kg", range: [0.8, 4], include: /bananen?\b/, exclude: PROCESSED },
  "Äpfel": { note: "fresh apples; not juice, smoothies or snacks", unit: "kg", range: [0.8, 6], include: /äpfel|tafeläpfel|(^|\s)apfel\b|elstar|gala|braeburn|jonagold|pink lady|granny smith|boskop|wetteräpfel/, exclude: /smoothie|mus\b|ringe|chips|saft|schorle|essig|strudel|tasche|kuchen|korn|likör|wein|cidre|apfelmus|riegel|joghurt|quark|brei|getrocknet|marmelade|gelee|tee\b|shampoo|dusch|duft/ },
  "Trauben": { unit: "kg", range: [1.5, 10], include: /trauben|weintrauben/, exclude: /saft|zucker|wein\b|rosinen|schorle|gummi|traubenzucker|kernöl|likör|getrocknet|johannisbeer|tomaten/ },
  "Zitronen": { unit: "kg", range: [1, 8], include: /zitronen?\b/, exclude: /heiße|klosterfrau|würzmittel|saft|tee\b|kuchen|limonade|limo\b|likör|melisse|gras|pfeffer|aroma|reiniger|spül|wasch|duft|bonbon|eis\b|torte|sorbet|schale|geschmack|drink|essig|curd|hähnchen|lachs|fisch/ },
  "Erdbeeren": { unit: "kg", range: [2, 20], include: /erdbeeren\b|erdbeer\s*schale/, exclude: /joghurt|konfitüre|marmelade|eis\b|getrocknet|kuchen|torte|quark|saft|sirup|likör|schoko|creme|tiefgefroren|tk\b|smoothie|bowl|gummi|fruchtaufstrich/ },
  // Vegetables
  "Tomaten": { unit: "kg", range: [1, 12], include: /tomaten\b|rispentomaten|cherrytomaten|cocktailtomaten|strauchtomaten|romatomaten|snacktomaten|cherryrispentomaten|datteltomaten/, exclude: /passiert|gehackt|mark|ketchup|sauce|soße|getrocknet|pesto|dose|konserve|stück(?:ig|chen)|suppe|saft|pizza|mozzarella|frischkäse|chips|aufstrich|würzig|cracker|sugo|polpa|feta|basilikum|in öl|eingelegt/ },
  "Gurke": { unit: "Stück", range: [0.3, 2.5], include: /gurke\b|salatgurken?|schlangengurken?|minigurken?/, exclude: /gewürzgurke|cornichon|glas|einleg|essig|salat\b|dill|senf|gurkensalat|tzatziki|snack-?gurken.*glas/ },
  "Paprika": { note: "fresh bell peppers; not jarred, spice or dishes", unit: "kg", range: [1.5, 12], include: /(^|[\s-])paprika\b|spitzpaprika|paprika\s*(rot|gelb|grün|mix)|paprikamix/, exclude: /geschnetzel|schinken|fleisch|chips|pulver|gewürz|edelsüß|geräuchert|gefüllt|creme|sauce|soße|aufstrich|wurst|salami|lyoner|chorizo|cracker|hummus|antipasti|eingelegt|glas|frischkäse|pesto|dip|würzer|marinade|hähnchen|schnitzel|gyros/ },
  "Kartoffeln": { note: "raw potatoes; not processed potato products", unit: "kg", range: [0.5, 4], include: /kartoffeln\b|speisekartoffeln|frühkartoffeln|drillinge|süßkartoffeln/, exclude: /herzogin|marzipan|pommes|chips|püree|klöße|knödel|gratin|puffer|rösti|salat|kroketten|wedges|spalten|ofen|tk\b|tiefgekühlt|fertig|suppe|bratkartoffeln|kartoffelteig/ },
  "Zwiebeln": { unit: "kg", range: [0.5, 7], include: /zwiebeln\b|speisezwiebeln|gemüsezwiebeln|rote zwiebeln|haushaltszwiebeln/, exclude: /silber|röst|ringe|schmalz|frühlings|lauchzwiebeln|suppe|chips|getrocknet|glas|confit|mett|sauce|soße|würz|chutney|kuchen|tarte|leberwurst/ },
  "Karotten": { unit: "kg", range: [0.4, 4], include: /karotten\b|möhren\b|bundmöhren|speisemöhren|bund-?karotten/, exclude: /saft|kuchen|salat|krüstchen|brot|brötchen|püree|erbsen|tk\b|tiefgekühlt|glas|dose|konserve|baby-?brei|snack|chips|cremesuppe|suppe|ingwer-/ },
  "Eisbergsalat": { unit: "Stück", range: [0.4, 2.5], include: /eisberg/, exclude: /mix|schale|fertig|dressing/ },
  // Beverages
  "Mineralwasser 1,5L": { note: "plain mineral water; not flavoured or functional water", unit: "L", range: [0.1, 2], include: /mineralwasser|tafelwasser|quellwasser|naturelle|medium\b|classic\b.*wasser|wasser\b.*(still|medium|classic|spritzig)|gerolsteiner|vittel|volvic|adelholzener|saskia|christinen|rheinfels|vilsa|apollinaris|bad liebenwerda|evian|staatl/, exclude: /aroma|geschmack|zitrone|limette|apfel|orange|frucht|tonic|kohlensäurefrei.*(apfel|zitrone)|flavour|plus|sprudler|filter|bügel|reiniger|lemon|holunder|minze|gurke|pfirsich|beeren|eistee|isotonic|sport/ },
  "Orangensaft": { unit: "L", range: [0.8, 5], include: /orangensaft|o-saft|orangen\s*(direkt)?saft|saft.*orange|orange.*(direktsaft|saft|100\s*%)/, exclude: /nektar|smoothie|limonade|schorle|light|eistee|likör|tee\b|drink|karotte|multivitamin|mango|maracuja|ananas|pfirsich|banane|apfel-/ },
  "Apfelsaft": { unit: "L", range: [0.6, 5], include: /apfelsaft|apfel\s*(direkt)?saft|apfel\s*klar|apfel\s*naturtrüb|apfeldirektsaft/, exclude: /schorle|nektar|smoothie|limonade|light|cidre|likör|essig|mango|kirsch|johannisbeer|holunder|orange|multivitamin|karotte|rhabarber|mix/ },
  "Kaffee Filterkaffee": { unit: "kg", range: [5, 40], include: /(^|\s)krönung|filterkaffee|röstkaffee|bohnenkaffee|kaffee\b|prodomo|tchibo|eduscho|dallmayr|melitta|onko|lavazza|segafredo|jacobs/, exclude: /sartori|joghurt|kapsel|pads|pad\b|discs|sticks|instant|löslich|cappuccino|latte|eiskaffee|kaffeesahne|weißer|kaffeefilter|filtertüten|maschine|vollautomat|becher|tasse|likör|schoko|kaffeerahm|milch|kaffeeweißer|dolce gusto|nespresso|senseo|tassimo|cold brew|chilled|kekse|kuchen|bonbons|3in1|3 in 1/ },
  "Schwarzer Tee": { unit: "kg", range: [5, 120], include: /schwarz\w*[-\s/]+.*tee|bünting|schwarzer tee|schwarztee|earl grey|ostfriesen|assam|darjeeling|english breakfast|ceylon|tee\s*schwarz/, exclude: /eistee|ice tea|kombucha|likör|kapsel|grüner|kräuter|früchte|rooibos|pfefferminz|kamille|chai latte|bonbon|kekse/ },
  // Pantry
  "Spaghetti": { note: "plain dried spaghetti; not protein or ready-made pasta", unit: "kg", range: [0.8, 10], include: /spaghetti|spaghettini|linguine/, exclude: /protein|träger|hemd|top\b|kleid|bh\b|bolognese|sauce|soße|fertig|kürbis|zucchini|eis\b|sugo|kochtopf|zange|topf|gericht|teller|carbonara|napoli|eis-spaghetti|spaghettieis/ },
  "Reis": { unit: "kg", range: [0.8, 8], include: /(^|\s)(basmati|jasmin|langkorn|parboiled|milch|risotto|natur|vollkorn|wild)?-?reis\b|basmatireis|jasminreis|langkornreis|parboiled|risottoreis|kochbeutel/, exclude: /becher|milchreis\s*(mit|becher|dessert|zimt|kirsch|vanille|grieß)|dessert|pudding|waffel|cracker|chips|reiswaffel|snack|riegel|crispies|drink|reisdrink|essig|nudeln|reisnudeln|fertig|pfanne|bowl|sushi|curry|paella|reisig|reise|reiseführer|kochreis\s*.*mit|gemüse|huhn|hähnchen|soße|sauce|risotto\s*(mit|al)|beutelreis.*(mit)|steinpilz|tomate|reisbrei|babybrei/ },
  "Mehl": { unit: "kg", range: [0.4, 3], include: /mehl\b|weizenmehl|dinkelmehl|roggenmehl|type\s*\d{3,4}|weizenvollkornmehl/, exclude: /backmischung|mischung|pfannkuchen|kuchen|brotback|pizza|teig|waffel|keks|paniermehl|semmelbrösel|johannisbrot|mandelmehl|kokosmehl|erdnuss|mehlwürmer|insekt/ },
  "Zucker": { unit: "kg", range: [0.6, 3], include: /zucker\b|kristallzucker|feinzucker|raffinade|rohrohrzucker|haushaltszucker|würfelzucker/, exclude: /puder|gelier|vanille|brauner|kandis|zuckerwatte|zuckerfrei|ohne zucker|zero|light|zuckerguss|streusel|deko|stange|zuckerrüben|sirup|hagel|zimt|zuckerschoten|traubenzucker|perlen|kekse|bonbon|zuckerstange|zuckerhut|candy|kaugummi|getränk|cola|limo|kuchen|konfitüre|marmelade|aufstrich|erdbeer|rübensirup|zuckermais|mais|erbsen|gewürz|weniger zucker|reduziert|zuckerreduziert|ohne zuckerzusatz|0 zucker|kein zucker|schoko|waffel|nüsse|mandeln/ },
  "Sonnenblumenöl": { unit: "L", range: [1, 6], include: /sonnenblumenöl|sonnenblumen-?öl|bratöl|speiseöl/, exclude: /spray|thunfisch|sardinen|makrele|hering|in öl|mayonnaise|margarine|dressing|chips|kerne|brot|seife|creme|lotion|bratheringe|frittiert/ },
  "Passierte Tomaten": { unit: "kg", range: [0.6, 5], kgOrL: true, include: /passiert|passata/, exclude: /kräuter|basilikum|knoblauch|chili|oliven|arrabbiata|sugo|sauce|soße/ },
  "Müsli": { unit: "kg", range: [1.5, 15], include: /müsli|muesli|granola/, exclude: /riegel|bar\b|joghurt|becher|keks|cookie|schoko(bons|riegel)|drink|snack|eis\b|quark|porridge.*becher|to go|bowl/ },
  // Frozen
  "TK-Pizza": { note: "frozen pizza", unit: "kg", range: [2, 15], include: /pizza|big city|ristorante|tradizionale|(^|\s)wagner\b.*(steinofen|piccolinis?)/, exclude: /kit\b|donut|teig|backmischung|mehl|gewürz|soße|sauce|stein|schneider|blech|ofen\b|baguette|brötchen|snack|minis?\b|bites|salami.*sticks|pizzaschnecke|pizzabrötchen|flammkuchen|käse\b.*gerieben|pizzakäse|reibe|tomaten|zange|kühlschrank|herd|maschine|spray|sticks|pizza-?burger|toast/ },
  "TK-Erbsen": { unit: "kg", range: [1, 8], include: /erbsen\b|erbsen\s*(fein|sehr fein|extra fein)|junge erbsen|tk-?erbsen|gartenerbsen/, exclude: /kichererbsen|zuckererbsen|zuckerschoten|erbsensuppe|eintopf|möhren|karotten|dose|glas|konserve|chips|snack|protein|wasabi|geröstet|erbsen\s*(&|und|mit)\s*(möhren|karotten)|erbsenmehl|püree|mix/ },
  "Fischstäbchen": { unit: "kg", range: [4, 20], include: /fischstäbchen|fish fingers|fischstäbchen/, exclude: /burger|wrap|snack|minis?/ },
  "TK-Spinat": { unit: "kg", range: [1, 8], include: /spinat/, exclude: /baby|pizza|lasagne|tasche|strudel|knödel|nudel|pasta|tortellini|ravioli|quiche|frischkäse|baby-?spinat(?!.*tk)|blattspinat.*frisch|salat|chips|smoothie|cannelloni|gnocchi|börek|pita|gözleme|teigtasche|flammkuchen|pfanne|gratin|auflauf|filet|lachs|fisch|hähnchen|feta|käse/ },
  // Eggs — flyers name eggs as compounds ("SONNENDORFER Körndleier"), so the
  // pattern allows them but rejects egg liqueur, noodles, salad and tools.
  "Eier": { note: "plain raw hen eggs; not dyed/coloured (Ostereier), boiled or egg products", unit: "Stück", range: [0.12, 0.8], include: /(^|[\s-])eier\b|(freiland|boden|bio|körndl|land|hof|bauern|frische)eier\b/, exclude: /likör|nudel|salat|becher|kocher|schneider|farb|färb|schoko|ostern|osterei|kinder|überraschung|deko|eierwärmer|gekocht|bunt|hartgekocht|pfanne|spätzle|pasta|waffel|teig|gebäck|keks|mayonnaise|eierlikör|bärlauch|ü-?ei|deko|weiß|plastik|kunststoff|holz|hänger/ },
  // Household
  "Spülmittel": { unit: "L", range: [0.5, 12], include: /spülmittel|geschirrspülmittel|handspül/, exclude: /maschine|tabs|caps|pulver|klarspüler|regeneriersalz|reiniger|spülmaschine|spülmaschinen|all in one|allin1|pods|gel\b.*maschine|pflege.*maschine|maschinenpfleger|bürste|schwamm|tücher|halter|dispenser|spender|gläser/ },
  "Toilettenpapier": { unit: "Stück", range: [0.1, 1.2], include: /toilettenpapier|klopapier|toilettenpapier|wc-?papier/, exclude: /feucht|feuchtes|reiniger|halter|ständer|aufbewahrung|bürste|spray|duftspüler|steine/ },
  "Küchenrolle": { unit: "Stück", range: [0.2, 2], include: /küchenrolle|küchentücher|haushaltsrolle|küchenpapier|wischtücher.*rolle|allzwecktücher.*rolle/, exclude: /halter|ständer|reiniger|feucht|spender|frischhalte|alufolie|backpapier/ },
  "Waschmittel": { note: "regular Voll- or Colorwaschmittel; not Feinwaschmittel/Wollwaschmittel, softener or laundry scent", unit: "Stück", range: [0.05, 0.6], include: /waschmittel|vollwaschmittel|colorwaschmittel|waschpulver|waschgel|wasch-?caps|waschmittel-?caps|pods/, exclude: /fein|wolle|weichspüler|wäscheparfüm|duftperlen|fleckenentferner|vorwasch|entkalker|hygienespüler|maschinenreiniger|tücher|farbfang|wäschekorb|wäscheständer|kessel|wäschenetz|wäscheleine|klammern|dosierkugel|spülmaschine|geschirr|spül|tabs.*(spül|geschirr)/ },
  // Batch 2 (2026-11-18): products sold by at least two stores, compared like for like.
  "Emmentaler": { unit: "kg", range: [5, 30], include: /emmentaler/, exclude: /gerieben|reibe|scheibletten|schmelz|sandwich|snack|toast|aufstrich|sauce|soße|fondue|baguette|pizza|brötchen/ },
  "Feta": { unit: "kg", range: [5, 25], include: /(^|[\s-])feta\b|hirtenkäse|schafskäse/, exclude: /creme|aufstrich|dip|salat|füllung|oliven|antipasti|gefüllt|paprika|tomate|pizza|blätterteig|börek|tasche|würfel in öl|in öl/ },
  "Skyr": { unit: "kg", range: [1.5, 8], include: /skyr/, exclude: /drink|riegel|bar\b|eis\b/ },
  "Margarine": { unit: "kg", range: [1.5, 10], include: /margarine|(^|\s)rama\b|lätta|sanella|becel|deli reform/, exclude: /cremefine|kochcreme|sahne|backen und|backwerk|creme fraîche|culinesse/ },
  "Camembert / Brie": { note: "plain soft cheese; not breaded Back-Camembert", unit: "kg", range: [5, 30], include: /camembert|(^|\s)brie\b/, exclude: /back-?camembert|gebacken|panier|backcamembert|ofen|dip|creme|aufstrich|baguette|sandwich/ },
  "Bratwurst": { unit: "kg", range: [4, 20], include: /bratwurst|rostbratwurst|grillwurst/, exclude: /brötchen|hot ?dog|curry|sauce|soße|suppe|eintopf|vegan|vegetar|veggie|pfanne|gericht|snack|schnecke/ },
  "Wiener Würstchen": { unit: "kg", range: [4, 20], include: /wiener|wienerle|knacker|frankfurter würstchen|geflügelwürstchen|würstchen/, exclude: /käse|brötchen|hot ?dog|teig|blätterteig|suppe|eintopf|vegan|vegetar|veggie|cocktail|mini.*snack|salat|cevapcici|bratwurst|weißwurst|rostbrat|curry/ },
  "Putenbrust": { unit: "kg", range: [6, 28], include: /puten(brust|schnitzel|filet|innenfilet)/, exclude: /aufschnitt|scheiben|geräuchert|gebraten|gegart|salami|wurst|panier|nugget|döner|gyros|snack|teriyaki/ },
  "Räucherlachs": { note: "cold-smoked salmon; not Graved Lachs or fresh salmon", unit: "kg", range: [15, 70], include: /räucherlachs|lachs.*geräuchert|geräuchert.*lachs|stremel/, exclude: /graved|aufstrich|creme|dip|frischkäse|bagel|sandwich|pizza|nudel|pasta|salat|snack|wrap|lachsforelle/ },
  "Clementinen / Mandarinen": { unit: "kg", range: [1, 6], include: /clementine|mandarine/, exclude: /saft|konserve|dose|glas|joghurt|tee|schoko|likör|marmelade|konfitüre|eis\b|kuchen|aroma|dessert/ },
  "Orangen": { unit: "kg", range: [0.8, 5], include: /orangen\b|(^|\s)orange\b|blutorangen|navel/, exclude: /saft|limonade|drink|konfitüre|marmelade|schoko|likör|tee|aroma|eis\b|kuchen|joghurt|dessert|fanta|chips|bonbon|gummi/ },
  "Birnen": { unit: "kg", range: [1, 6], include: /birnen\b|(^|\s)birne\b|tafelbirnen|conference|williams/, exclude: /saft|schnaps|brand|geist|likör|konserve|dose|glas|kuchen|joghurt|dessert|chips|helene|nektar|aroma/ },
  "Kiwi": { unit: "Stück", range: [0.1, 1.5], include: /kiwi/, exclude: /saft|smoothie|joghurt|dessert|eis\b|konfitüre|marmelade|getrocknet|chips|drink|limonade|aroma/ },
  "Champignons": { unit: "kg", range: [2, 12], include: /champignon/, exclude: /konserve|dose|glas|scheiben in|cremesuppe|suppe|sauce|soße|pfanne|gericht|pizza|tk\b|tiefgefroren|getrocknet|rahm/ },
  "Nudeln (Penne / Fusilli)": { unit: "kg", range: [0.8, 10], include: /penne|fusilli|farfalle|rigatoni|tortiglioni|maccheroni|makkaroni|eliche|gnocchetti|orecchiette/, exclude: /fertig|gericht|pfanne|sauce|soße|salat|auflauf|tk\b|tiefgefroren|frisch.*kühl|gefüllt|bolognese|carbonara|protein|glutenfrei|vegan.*gericht/ },
  "Mayonnaise": { unit: "kg", range: [2, 15], kgOrL: true, include: /mayonnaise|salatmayonnaise|salatcreme|miracel whip/, exclude: /dip|kartoffelsalat|nudelsalat|salat\b|wurstsalat|krautsalat|burger|sandwich|vegan.*aioli|aioli|knoblauch|chipotle|wasabi|trüffel/ },
  "Senf": { unit: "kg", range: [1.5, 15], kgOrL: true, include: /(^|[\s-])senf\b|dijon|mostrich/, exclude: /saat|körner|pulver|gurke|sauce|soße|dressing|dip|hering|ei\b|eier|marinade|brezel|chips|honig-?senf-?sauce/ },
  "Honig": { unit: "kg", range: [4, 30], include: /honig/, exclude: /honigmelone|kuchen|lebkuchen|bonbon|tee|senf|sauce|soße|dressing|müsli|crunchy|cerealien|nüsse|schinken|joghurt|likör|met\b|wein|hustens|creme|riegel|bärenmarke/ },
  "Nuss-Nougat-Creme": { unit: "kg", range: [3, 18], include: /nuss-?nougat|nougatcreme|nutella|haselnusscreme|nusskati/, exclude: /croissant|riegel|keks|kekse|waffel|joghurt|eis\b|kuchen|torte|praline|brötchen|teilchen|crêpe|crepe|biscuit|go\b/ },
  "Konfitüre": { note: "fruit jam or spread for people; not pet food in jelly", unit: "kg", range: [2, 15], include: /konfitüre|marmelade|fruchtaufstrich/, exclude: /katze|hund|felix|whiskas|sheba|croissant|kuchen|plätzchen|keks|joghurt|berliner|krapfen|muffin|torte|waffel|brötchen|teilchen|tasche|füllung|zucker\b.*gelier|gelierzucker/ },
  "Cola": { unit: "L", range: [0.3, 3.5], include: /(^|[\s-])cola\b|coca-?cola|pepsi|fritz-?kola/, exclude: /energy|bonbon|gummi|fruchtgummi|lutscher|kuchen|eis\b|rum|whisk|bourbon|jim beam|jack daniel|mix\b.*rum|bacardi|asbach|captain/ },
  "Limonade": { unit: "L", range: [0.3, 3.5], include: /limonade|(^|\s)limo\b|fanta|sprite|mezzo mix|schwip schwap|7 ?up|mirinda|bionade|fritz-?limo|orangenlimonade|zitronenlimonade/, exclude: /bonbon|gummi|sirup|pulver|eis\b|brause.*pulver/ },
  "Pils": { unit: "L", range: [0.8, 6], include: /pils\b|pilsener|pilsner/, exclude: /glas\b.*set|gläser|alkoholfrei.*0,0|radler|alster|mix\b/ },
  "Kaffeekapseln": { unit: "Stück", range: [0.1, 0.8], include: /kapseln|kaffeekapseln|nespresso.*kompatib|dolce gusto|tassimo|t-?discs/, exclude: /spül|waschmittel|vitamin|nahrungsergänzung|tabletten|reiniger|entkalk|halter|ständer|automat|maschine/ },
  "Schokolade (Tafel)": { note: "plain chocolate bars; not seasonal figures, assortments, sprinkles or filled pralines", unit: "kg", range: [4, 40], include: /schokolade|(^|\s)milka\b|ritter sport|lindt.*(tafel|excellence)|tafelschokolade|vollmilchschokolade|zartbitter/, exclude: /weihnachts|schneemann|streusel|mischung|raspel|riegel|praline|kugeln|figur|weihnachtsmann|nikolaus|osterhase|adventskalender|keks|kekse|waffel|drink|milch\b.*drink|pudding|eis\b|kuchen|torte|muffin|creme|aufstrich|crossies|bons|herzen|täfelchen|mini|weihnachtlich|zapfen|trüffel|cookie|brownie|getränk|kakao|sauce|dessert|joghurt|knusperflakes|müsli|cerealien|überzogen|glasur/ },
  "Gummibärchen / Fruchtgummi": { unit: "kg", range: [3, 25], include: /gummibär|fruchtgummi|haribo|goldbären|weingummi|lakritz|trolli|katjes|nimm2 lachgummi/, exclude: /zahnpasta|vitamin|nahrungsergänzung|kinder.*vitamin|protein/ },
  "Chips": { unit: "kg", range: [4, 30], include: /chips|lorenz naturals|crunchips|pringles|lay'?s|chio\b|funny-frisch|kartoffelchips|tortillachips|nachos/, exclude: /fish|fisch|schoko|bananen|äpfel|apfelchips|gemüsechips|chocolate|kokos|dip\b.*only|tk\b|pommes/ },
  "Eiscreme": { unit: "L", range: [1.5, 25], kgOrL: true, include: /eiscreme|speiseeis|(^|\s)eis\b|magnum|cornetto|cremissimo|ben ?& ?jerry|häagen|mövenpick.*eis|carte d'or|eis am stiel|eisbecher|sandwich-?eis/, exclude: /eistee|eiskaffee|eisbergsalat|eiswürfel|eiskratzer|eisschokolade|eiszapfen|eissp|eisbein|eis-?spray|eisform/ },
  "Zahnpasta": { unit: "L", range: [10, 150], include: /zahncreme|zahnpasta|zahngel|elmex|colgate|signal|blend-?a-?med|sensodyne|aronal|meridol|parodontax|odol-?med/, exclude: /zahnbürste|bürste|zahnseide|mundspül|mundwasser|halter|becher|kinder.*bürste|aufsätze/ },
  "Duschgel": { unit: "L", range: [2, 25], include: /duschgel|duschcreme|duschbad|cremedusche|dusche\b/, exclude: /duschvorhang|duschkopf|brause|abzieher|matte|regal|tuch|handtuch|haube|vorhang|wand/ },
  "Shampoo": { unit: "L", range: [2, 30], include: /shampoo/, exclude: /teppich|auto|hund|katze|tier|polster|bürste|trocken.?shampoo|dry shampoo|seife/ },
  "Weichspüler": { note: "fabric softener; not laundry scent (Wäscheparfum), detergent or scent beads", unit: "Stück", range: [0.03, 0.5], include: /weichspüler|lenor|kuschelweich|softlan|vernel/, exclude: /parfum|wäscheduft|waschmittel|duftperlen|tücher|kugel|ball/ },
  "Geschirrspültabs": { unit: "Stück", range: [0.05, 0.6], include: /spülmaschinen.?tabs|geschirrspül.*tabs|all.?in.?1.*tabs|finish.*tabs|somat.*tabs|tabs\b/, exclude: /wc|toilette|reiniger(?!.*tabs)|entkalker|maschinenpfleger|klarspüler|salz|waschmittel|waschtabs|vollwaschmittel|colorwaschmittel|bad|pool|chlor|duft|kaffee|kapseln/ },
};

/** Catalog product name → the offer that is the best buy for it in one store. */
/** A person's verdict on "offer name X is / is not product P" (from the review queue). */
export interface MatchDecisions {
  /** lower-case offer name → products it was approved as */
  approved: Map<string, Set<string>>;
  /** lower-case offer name → products it was rejected as */
  rejected: Map<string, Set<string>>;
}

export interface Candidate {
  offer: Offer;
  unitPrice: number;
}

/** Catalog products whose rules accept this offer name (prices aside). */
export function ruleMatches(offer: Offer, catalog: Record<string, CatalogRule> = CATALOG): string[] {
  const name = offer.name.toLowerCase();
  // "kg-Preis" is a pack size, not ice cream ("eis") — drop it before excluding.
  const nameAndPack = `${name} ${offer.unitText.toLowerCase().replace(/preis/g, "")}`;
  return Object.entries(catalog)
    .filter(([, rule]) => rule.include.test(name) && !rule.exclude?.test(nameAndPack))
    .map(([product]) => product);
}

/**
 * Every offer that counts as each product, cheapest per unit first.
 * Counts = matched by the rules or approved in review, and not rejected in review.
 */
export function rankOffers(
  offers: Offer[],
  catalog: Record<string, CatalogRule> = CATALOG,
  decisions?: MatchDecisions,
): Map<string, Candidate[]> {
  const ranked = new Map<string, Candidate[]>();
  for (const offer of offers) {
    const key = offer.name.toLowerCase();
    const products = new Set(ruleMatches(offer, catalog));
    for (const p of decisions?.approved.get(key) ?? []) if (catalog[p]) products.add(p);
    for (const p of decisions?.rejected.get(key) ?? []) products.delete(p);

    for (const product of products) {
      const rule = catalog[product];
      const up =
        unitPrice(offer, rule.unit) ??
        (rule.kgOrL ? unitPrice(offer, rule.unit === "kg" ? "L" : "kg") : null);
      // An offer we cannot price per unit cannot be compared — leave it out.
      if (up === null || !(up > 0)) continue;
      const list = ranked.get(product) ?? [];
      list.push({ offer, unitPrice: up });
      ranked.set(product, list);
    }
  }
  for (const list of ranked.values()) list.sort((a, b) => a.unitPrice - b.unitPrice);
  return ranked;
}

/** The cheapest offer per product (no review decisions, no price checks). */
export function bestOffers(
  offers: Offer[],
  catalog: Record<string, CatalogRule> = CATALOG,
): Map<string, Candidate> {
  return new Map([...rankOffers(offers, catalog)].map(([p, list]) => [p, list[0]]));
}

/**
 * Why this unit price is not believable for the product, or null when it is.
 * `previous` is the unit price shown until now (same store), if any.
 */
export function priceProblem(product: string, unitPrice: number, previous?: number | null): string | null {
  const rule = CATALOG[product];
  if (!rule) return null;
  const [min, max] = rule.range;
  const fmt = (n: number) => n.toFixed(2).replace(".", ",");
  if (unitPrice < min || unitPrice > max) {
    return `${fmt(unitPrice)} €/${rule.unit} liegt außerhalb von ${fmt(min)}–${fmt(max)} €/${rule.unit}`;
  }
  if (previous && (unitPrice > previous * 3 || unitPrice < previous / 3)) {
    return `${fmt(unitPrice)} €/${rule.unit} statt bisher ${fmt(previous)} €/${rule.unit} (mehr als Faktor 3)`;
  }
  return null;
}
