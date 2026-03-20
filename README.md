# Lounasjuna

Toimiston lounasjunien koordinointityökalu. Hakee päivän lounaslistat automaattisesti [lounaat.info](https://www.lounaat.info)-palvelusta, mahdollistaa ravintolaäänestyksen ja lounasjunien organisoinnin.

## Ominaisuudet

- **Päivittäiset lounaslistat** — haetaan automaattisesti lounaat.info-palvelusta
- **Äänestys** — äänestä ravintolaa, peru äänesi; yksi ääni per ravintola per päivä
- **Lounasjunat** — luo juna, kutsu kollegat, liity mukaan; yksi liittyminen per juna
- **Päivänvalinta** — selaa tulevia päiviä tänään → ensi maanantai
- **Käyttäjätunnistus** — JWT-pohjainen kirjautuminen

## Asennus

```bash
# Asenna riippuvuudet (backend + frontend)
npm run install:all
```

## Käynnistys

Käynnistä backend ja frontend erikseen kahdessa terminaalissa:

```bash
# Backend (portti 3001)
npm run backend

# Frontend (portti 5173)
npm run frontend
```

Avaa selaimessa: http://localhost:5173

## Rakenne

```
lounasjuna/
├── backend/
│   ├── server.js          # Express-palvelin, REST API
│   ├── db.js              # SQLite-tietokanta (better-sqlite3)
│   ├── auth/
│   │   └── auth.js        # JWT-rekisteröinti ja kirjautuminen
│   ├── scraper/
│   │   └── lounaat.js     # lounaat.info-scraper
│   └── data/
│       └── lounasjuna.db  # SQLite-tietokanta (ei versiohallinnassa)
└── frontend/
    └── src/
        ├── App.jsx                        # Pääkomponentti, tila ja API-kutsut
        └── components/
            ├── RestaurantCard.jsx         # Ravintola + äänestys
            ├── RestaurantList.jsx         # Ravintoloiden lista
            └── LunchTrainSection.jsx      # Lounasjunat
```

## API

| Metodi | Polku | Kuvaus |
|--------|-------|--------|
| GET | `/api/restaurants?date=` | Päivän lounaslistat |
| POST | `/api/restaurants/refresh?date=` | Pakota haku uudelleen |
| GET | `/api/votes?date=` | Äänet päivälle |
| POST | `/api/votes` | Äänestä (vaatii kirjautumisen) |
| DELETE | `/api/votes/:restaurantId?date=` | Peru ääni (vaatii kirjautumisen) |
| GET | `/api/trains?date=` | Lounasjunat päivälle |
| POST | `/api/trains` | Luo juna (vaatii kirjautumisen) |
| POST | `/api/trains/:id/join` | Liity junaan (vaatii kirjautumisen) |
| DELETE | `/api/trains/:id/participants/:participantId` | Poistu junasta (vaatii kirjautumisen) |
| POST | `/api/auth/register` | Rekisteröidy |
| POST | `/api/auth/login` | Kirjaudu sisään |

## Teknologiat

- **Backend:** Node.js, Express, better-sqlite3, bcrypt, jsonwebtoken, cheerio
- **Frontend:** React, Vite
- **Tietokanta:** SQLite
