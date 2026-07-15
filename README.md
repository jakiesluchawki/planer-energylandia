# PogodaPark — planer Energylandii

Zbudowałem mobilny planer, który najpierw pomaga zdecydować **czy i kiedy jechać do Energylandii**, a potem układa bezpieczny plan dnia dla konkretnej grupy.

**Aplikacja:** https://jakiesluchawki.github.io/planer-energylandia/

![Ekran wejścia do PogodaParku](./docs/qa/entry-and-pdf/entry-390x844.png)

## Dwie decyzje, jeden produkt

Pierwszy ekran rozdziela dwie sytuacje:

- `Sprawdź pogodę` — dla osób, które nadal wybierają termin i liczbę dni,
- `Ułóż plan` — dla osób, które mają już bilety lub podjęły decyzję.

Po krótkim onboardingu planer bierze pod uwagę skład grupy, konserwatywne zakresy wieku i wzrostu, intensywność, wodę, kolejki, zgodę na podział, posiłek, pokazy i czas wizyty.

## Co działa

- rekomendacja pogody na jeden, dwa lub trzy dni,
- świeży alert Antistorm z ostrożnym buforem dojścia do samochodu,
- bezpieczna kwalifikacja atrakcji z oficjalnych ograniczeń,
- wspólna trasa i opcjonalny podział grupy z dorosłym opiekunem,
- kolejki, posiłek, bufor, pokazy i zachowany koniec dnia,
- mapa, GPS, dystans do następnego punktu oraz Apple Maps i Google Maps,
- oznaczanie zaliczonych atrakcji,
- graficzny podgląd do druku lub zapisu PDF,
- anonimowe krótkie linki ważne maksymalnie 90 dni,
- odczyt starszych, długich linków `#plan=`.

## Prywatność

Nie ma kont, reklam ani analityki behawioralnej. Lokalizacja pozostaje na urządzeniu. Krótki link przechowuje wyłącznie anonimowy, kompaktowy plan potrzebny do jego ponownego otwarcia i wygasa najpóźniej po 90 dniach.

## Źródła

- oficjalne strony atrakcji, pokazów i mapa Energylandii,
- ICM, Open-Meteo, MET Norway, DWD/Bright Sky,
- Antistorm jako bieżący sygnał opadu i burzy,
- Queue-Times jako nieoficjalna migawka kolejek,
- OpenStreetMap jako źródło współrzędnych.

Źródło zewnętrzne, regulamin parku, pomiar i decyzja obsługi zawsze mają pierwszeństwo przed rekomendacją aplikacji.

## Uruchomienie lokalne

Wymagany jest Node.js 22+.

```bash
npm ci
npm test
npm run dev
```

Odświeżenie danych:

```bash
npm run refresh:queues
npm run refresh:shows
```

Build produkcyjny:

```bash
npm run build
npm run preview
```

## Krótkie linki

Frontend działa statycznie na GitHub Pages. Opaque tokeny `#p/<16 znaków>` obsługuje mały Cloudflare Worker z Durable Objectem, opisany w [`services/shortlinks`](./services/shortlinks/README.md). Worker akceptuje wyłącznie wersjonowany, walidowany format planu i nie udostępnia listowania danych.

## Automatyzacja

GitHub Actions co 10 minut:

1. uruchamia testy frontendu i usługi krótkich linków,
2. odświeża kolejki i oficjalny terminarz pokazów,
3. buduje aplikację,
4. publikuje ją przez GitHub Pages.

## Materiały

- [`docs/qa`](./docs/qa) — zaakceptowane widoki mobilne i regresje,
- [`design-qa.md`](./design-qa.md) — decyzje wizualne i zakres QA,
- [`media/launch-story`](./media/launch-story) — siedmioplanszowa historia premiery.

PogodaPark i Gdzie Żaba są celowo publikowane jako dwa osobne produkty. Łączy je język CHMURNIK — Romie, Roobert, filc, papier i spokojna hierarchia — ale każdy ma niezależny kod, adres i narrację.
