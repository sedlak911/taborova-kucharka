# Podněty z final review fáze 3 pro fáze 5+

- **Kcal přes `ediblePortion` u surovin s kostí:** validátor a budoucí nutrice počítají `g × kcal`, bez `ediblePortion`. U `cele-kure` (0,68), `jehneci-maso` (0,77) a `uzene-koleno` (0,78) to nadsazuje kcal o 20–30 % (např. kure-na-lovecky 827 → ~590, skotská polévka, kureci-dusene-s-zeleninou). V nutriční fázi počítat u surovin „s kostí“ `g × ediblePortion`.
- **Koncentráty/zavařeniny a `baseServings`:** `merunkovy-dzem` (677 kcal/porci) a `citronovy-sirup` (668) mají porci jako čtvrtinu dávky, což je pro košík a nutrici zavádějící. Zvážit `baseServings` jako počet sklenic nebo nápojů; zatím to vysvětluje `modernNote`.
- **Tag `levne` 73/78:** jako filtr skoro nic neodliší. Pro fázi s UI zvážit užší kritérium (např. odhad Kč/porci).
