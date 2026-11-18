/**
 * Browse category for any offer, from its name (and description). The four
 * stores each use their own category scheme, so one name-based classifier
 * keeps the Angebote page consistent. Checked against Aldi Nord's own
 * category labels (see __tests__/categorize.test.ts for the accuracy floor).
 *
 * Rules are tried in order; the first match wins, so more specific groups
 * (alcohol before drinks, drugstore before food words like "milch") come first.
 */
export const BROWSE_CATEGORIES = [
  "obst-gemuese", "milch-kaese", "fleisch-fisch", "brot-aufstriche", "vorrat",
  "tiefkuehl-fertig", "suesses-snacks", "getraenke", "alkohol", "drogerie",
  "haushalt", "sonstiges",
] as const;
export type BrowseCategory = (typeof BROWSE_CATEGORIES)[number];

const RULES: Array<[BrowseCategory, RegExp]> = [
  ["drogerie", /l'or[ée]al|nivea|garnier|\bdove\b|balea|colgate|oral-b|gillette|schwarzkopf|pantene|head & shoulders|rexona|\baxe\b|elmex|signal\b|pampers|labello|wilkinson|shampoo|duschgel|dusch|zahnpasta|zahnbürste|zahncreme|mundspül|deo|deodorant|bodylotion|lotion|(haut|gesichts|hand|tages|nacht|körper|fuß|augen)creme|gesichts|hautpflege|haar|rasier|windel|feuchttücher|baby|tampon|binden|slipeinlage|make-?up|lippen|nagel|parfum|eau de|handseife|seife|sonnenschutz|sonnenmilch|pflaster|wattepads|wattestäbchen|kosmetik|hygiene|intim|nahrungsergänzung|tabletten/],
  ["haushalt", /ariel|persil|lenor|frosch|meister proper|calgon|finish\b|somat|vanish|domestos|pril\b|fairy|whiskas|felix\b|pedigree|cesar\b|sheba|kitekat|lucky dog|perfect fit|dreamies|purina|pods\b|waschmittel|weichspüler|spülmittel|geschirr|spülmaschine|reiniger|putz|toilettenpapier|küchenrolle|küchentücher|taschentücher|müllbeutel|müllsack|alufolie|frischhalte|backpapier|gefrierbeutel|schwamm|kerze|batterie|glühbirne|leuchtmittel|katzen|hunde|tierfutter|katzenstreu|vogelfutter|nassfutter|trockenfutter|wc-|klarspüler|entkalker|insekt|lufterfrisch|duftkerze|wäsche/],
  ["alkohol", /crémant|cremant|silvaner|riesling|grauburgunder|weißburgunder|spätburgunder|merlot|cabernet|chardonnay|sauvignon|primitivo|tempranillo|rioja|chianti|dornfelder|kabinett|spätlese|tonic\b|\bbier\b|\bpils\b|pilsener|weizenbier|hefeweizen|weißbier|radler|\bwein\b|weißwein|rotwein|rosé|\bsekt\b|prosecco|champagner|\bcava\b|lambrusco|glühwein|likör|vodka|wodka|whisk(e)?y|\brum\b|\bgin\b|doppelkorn|kornbrand|schnaps|aperitif|aperol|spirituose|brandy|weinbrand|tequila|jägermeister|eierlikör|cider|hugo\b|spritz/],
  ["getraenke", /wasser\b|mineralwasser|sprudel|limonade|\blimo\b|cola|fanta|sprite|eistee|saft\b|säfte|nektar|smoothie|schorle|energy|drink\b|kaffee|espresso|cappuccino|tee\b|teebeutel|kakao|trinkschokolade|kapseln|pads\b|bohnen\b.*kaffee|getränk/],
  ["vorrat", /passiert|tomatenmark|gehackte tomaten|in stücken|konserve|\bdose\b|im glas|getrocknet|pulver|gewürz|würzmischung|brühe|bouillon|fix\b|fix für|sauce|soße|pesto|ketchup|mayonnaise|senf\b|essig|\böl\b|olivenöl|rapsöl|sonnenblumenöl/],
  ["brot-aufstriche", /brot\b|brötchen|toast|baguette|ciabatta|croissant|laugen|brioche|semmel|knäcke|zwieback|wraps?\b|tortilla|fladenbrot|pita|aufback|buns\b|konfitüre|marmelade|fruchtaufstrich|honig|nuss-nougat|nougatcreme|erdnusscreme|nutella|aufstrich|müsli|cornflakes|cerealien|haferflocken|porridge|granola|crunchy|backwaren|schnitte\b/],
  ["tiefkuehl-fertig", /tiefgefroren|tiefgekühlt|\btk[- ]|pizza|lasagne|fertiggericht|eintopf|suppe|nudelpfanne|bowl\b|burrito|wrap\b|sandwich|frikadellen|pommes|kroketten|rösti|nuggets|fischstäbchen|schlemmerfilet|bratkartoffel|maultaschen|ravioli|tortellini|gnocchi|knödel|klöße|frühlingsrolle|dumplings|curry\b|chili con|gulasch|ofengemüse|rahmspinat|gemüsepfanne|aufläufe|auflauf/],
  ["suesses-snacks", /milka|ferrero|lindt|haribo|kinder\b|toffifee|raffaello|merci\b|ritter sport|m&m|snickers|twix|\bmars\b|bounty|kitkat|oreo|leibniz|bahlsen|lorenz|funny-frisch|pringles|chio\b|crunchips|ültje|mikado|snack-hits|karamell|krokant|gummibär|zuckerl|fruchtschnitte|knusper|vollmilch-?schoko|zartbitter|kakao-?glasur|lolli|lutscher|dragee|pralinen|nougat|mürbe|plätzchen|zimtsterne|printen|baumkuchen|früchtebrot|honigkuchen|christstollen|schoko|schokolade|praline|riegel|keks|kekse|cookie|waffel|gebäck|lebkuchen|spekulatius|stollen|dominosteine|marzipan|bonbon|gummi|fruchtgummi|lakritz|kaugummi|chips|flips|erdnussflips|salzstangen|brezel(chen)?|cracker|popcorn|nüsse|nussmischung|studentenfutter|mandeln|cashew|pistazien|kuchen|torte|muffin|donut|brownie|dessert|pudding|mousse|eis\b|eiscreme|sorbet|tiramisu|zucker(l)?\b.*(guss|streusel)|nougat|trüffel|adventskalender|weihnachtsmann|nikolaus|osterhase/],
  ["fleisch-fisch", /leberkäse|dorade|zander|scholle|pangasius|tilapia|calamari|tintenfisch|muscheln|karree\b|fleisch|hack|hähnchen|huhn|hühner|pute|puten|rind|schwein|kalb|lamm|ente|gans|wild\b|steak|schnitzel|filet|braten|kotelett|nacken|gulasch|wurst|würstchen|bratwurst|wiener|bockwurst|salami|schinken|speck|bacon|leberwurst|leberkäse|aufschnitt|mortadella|chorizo|lachs|thunfisch|hering|forelle|makrele|garnelen|shrimps|fisch|kabeljau|seelachs|matjes|sardinen|surimi|döner|gyros|cevapcici|frikadelle|bulette/],
  ["milch-kaese", /milch\b|vollmilch|h-milch|frischmilch|buttermilch|joghurt|jogurt|quark|skyr|kefir|ayran|sahne|schmand|crème fraîche|creme fraiche|saure sahne|butter\b|butterschmalz|margarine|käse|gouda|emmentaler|edamer|mozzarella|feta|camembert|brie|parmesan|grana|mascarpone|ricotta|halloumi|frischkäse|hüttenkäse|schmelzkäse|eier\b|\beier|milchreis|grießbrei/],
  ["brot-aufstriche", /brot\b|brötchen|toast|baguette|ciabatta|croissant|laugen|brezel\b|semmel|knäcke|zwieback|wrap|tortilla|fladenbrot|pita|aufback|konfitüre|marmelade|fruchtaufstrich|honig|nuss-nugat|nutella|aufstrich|müsli|cornflakes|cerealien|haferflocken|porridge|granola|crunchy/],
  ["obst-gemuese", /apfel|äpfel|birne|banane|orange|mandarine|clementine|zitrone|limette|grapefruit|traube|beere|erdbeer|himbeer|heidelbeer|kiwi|ananas|mango|melone|pfirsich|nektarine|pflaume|kirsche|avocado|granatapfel|obst|tomate|gurke|paprika|zucchini|aubergine|karotte|möhre|kartoffel|zwiebel|knoblauch|salat\b|eisberg|rucola|spinat|brokkoli|blumenkohl|kohl|lauch|porree|sellerie|champignon|pilze|radieschen|kürbis|spargel|mais\b|bohnen\b|erbsen\b|ingwer|kräuter|gemüse/],
  ["vorrat", /nudel|spaghetti|penne|fusilli|pasta|makkaroni|lasagneplatten|reis\b|basmati|couscous|bulgur|quinoa|linsen|kichererbsen|mehl\b|zucker\b|salz\b|pfeffer|gewürz|paprikapulver|öl\b|olivenöl|rapsöl|sonnenblumenöl|essig|ketchup|mayonnaise|senf|soße|sauce|pesto|brühe|bouillon|konserve|dose\b|passata|passierte|tomatenmark|backpulver|hefe|vanillezucker|puddingpulver|kokosmilch|sojasauce|dressing|tahin|oliven\b|antipasti|gurken\b.*glas|sauerkraut/],
];

function classify(text: string): BrowseCategory | null {
  for (const [cat, re] of RULES) if (re.test(text)) return cat;
  return null;
}

/**
 * Only the name decides. Descriptions mislead ("mit Weizenmehl", "entfernt
 * Schnee und Eis"), and a wrong category is worse than "Sonstiges".
 */
export function categorize(name: string): BrowseCategory {
  return classify(name.toLowerCase()) ?? "sonstiges";
}
