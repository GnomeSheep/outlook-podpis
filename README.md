# 📧 CloudForce Outlook Signature Add-in (v2)

Firemní podpisový plugin do Outlooku s vizuálním návrhářem skinů pro administrátora.

---

## 📁 Soubory

```
outlook-signature-addin/
├── admin.html             ← NÁVRHÁŘ pro admina (vizuální editor skinů)
├── taskpane.html          ← Plugin pro uživatele (panel v Outlooku)
├── signature-renderer.js  ← Sdílená logika renderování (admin + plugin + auto-insert)
├── commands.html          ← Runtime pro ribbon tlačítko + auto-vkládání
├── commands.js            ← Handler automatického vkládání podpisu
├── lib-qrcode.js          ← Knihovna pro QR kódy (vCard)
├── skins.json             ← Databáze skinů (admin exportuje → uživatelé stahují)
├── manifest.xml           ← Registrace v Outlooku/M365
└── README.md
```

---

## 🚀 Nasazení

1. **Nahrajte všechny soubory** na HTTPS hosting (např. `https://moje-firma.cz/signature-addin/`).
2. **Upravte `manifest.xml`** — nahraďte `VAS-HOSTING.cz` vaší doménou, vložte nové `<Id>` (GUID) a `<ProviderName>`.
3. **Nasaďte manifest** přes Microsoft 365 Admin Center → *Settings → Integrated Apps → Upload custom app*.

---

## 🎨 Workflow administrátora

1. Otevřete `admin.html` v prohlížeči.
2. Klikněte **+ Nový** → vyberte hotovou šablonu nebo začněte od základu.
3. Upravte barvy, písmo, logo, prvky, menu, sociální sítě, banner...
4. Sledujte živý náhled (vč. dark mode přepínače) a HTML kód.
5. Klikněte **🔍 Kontrola** pro validaci (rozbité URL, kontrast, chybějící data).
6. Klikněte **💾 Export skins.json** a nahrajte soubor na hosting.
7. Uživatelé uvidí nové skiny po dalším otevření pluginu.

---

## 🆕 Funkce v3 (drobná vylepšení)

### Pro uživatele
- **📋 Kopírovat podpis** — zkopíruje formátovaný podpis do schránky (i pro klienty bez auto-vkládání).
- **🗑 Odebrat podpis** — odstraní vložený podpis z e-mailu.
- **Pojistka proti dvojitému podpisu** — pozná existující podpis a nabídne nahrazení.
- **Automatická detekce dark mode** — podle motivu Outlooku (`Office.context.officeTheme`).
- **Krátký podpis pro odpovědi** — u Reply/Forward nabídne stručnou verzi (jméno + telefon + email).
- **Nová pole** — zájmena, oddělení, mobil, adresa kanceláře.
- **Uvítací nápověda** — krátký tip při prvním spuštění.

### Pro admina
- **⚖️ Disclaimer / patička** — právní/GDPR text pod podpisem (vč. překladů).
- **★ Výchozí skin** — označený skin se uživatelům předvybere.
- **🎨 Paleta barev značky** — uložené firemní barvy jako klikací vzorky (klik = kopírovat hex).
- **↺ Reset** — zahodí neuložené změny skinu.
- **⬇ Export jednoho skinu** — sdílení konkrétního skinu místo celého souboru.
- **Validace šířky** — upozorní na logo/banner širší než 600px (oříznutí na mobilu).

---

## ✨ Funkce v2

### Pro uživatele (taskpane.html)
- **Načtení údajů z M365** — jméno a email jedním klikem (`Office.context.mailbox.userProfile`).
- **Foto profilu** — drag & drop nebo výběr souboru (base64).
- **Sociální sítě** — pole se zobrazí podle toho, co admin v daném skinu povolil.
- **Výběr jazyka** — CS / EN / DE / SK (přepne přeložené texty).
- **Dark mode náhled** — přepínač v záložce Náhled.
- **Automatické vkládání** — přepínač; podpis se vloží sám při každém novém emailu
  (uloženo v Roaming Settings, vkládá `commands.js` přes `OnNewMessageCompose`).

### Pro admina (admin.html)
- **Galerie šablon** — 6 hotových výchozích návrhů.
- **Drag & drop logo** — nahrání obrázku (base64); pro produkci doporučeno nahrát na hosting a vložit URL.
- **Validace skinu** — kontrola URL, kontrastu, dat banneru, prázdných sekcí.
- **Editor banneru** — obrázek + odkaz + okno platnosti (od–do). Banner se sám skryje mimo termín.
- **Sociální sítě** — výběr platforem (LinkedIn, X, Facebook, Instagram, GitHub, YouTube).
- **QR vizitka** — QR kód s vCard (viz upozornění níže).
- **Jazykové varianty** — překlady textu webu a menu pro EN/DE/SK.
- **Dark mode varianta** — zvlášť barvy pro tmavý režim.

---

## ⚠️ Důležitá upozornění

- **QR kódy** se vkládají jako base64 obrázky. Klasický **Outlook na Windows** (engine Wordu)
  může base64 obrázky blokovat. Vždy otestujte před plošným nasazením, nebo QR nepoužívejte.
- **Foto a logo přes base64** zvětšují velikost emailu. Pro produkci je lepší obrázky
  hostovat a vkládat jen URL.
- **Pozice a telefon z M365** vyžadují Microsoft Graph (`/me`), což potřebuje registraci aplikace
  v Entra ID a SSO. V této verzi se z M365 načítá jen jméno a email (spolehlivě, bez Graphu).
  Pozici a telefon vyplní uživatel ručně.
- **Auto-vkládání** vyžaduje Outlook s podporou event-based aktivace (Mailbox 1.10+).

---

## 🔧 Co se vědomě NEdělalo (potřebuje backend / není vhodné)

Statistiky a tracking, verzování s audit logem, HR synchronizace, AI doporučení a LinkedIn
import zde nejsou — vyžadují serverovou část (databáze, API klíče), nebo jsou proti podmínkám
služeb. Pokud je budete chtít, je potřeba doplnit malý backend (Node.js/.NET) — `skins.json`
by pak byl jen exportním formátem.
