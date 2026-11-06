# Tower Profile

A tiny web app that turns a Roblox username into an **Eternal Towers of Hell tower profile** image
using stats from [TowerStats](https://towerstats.com). The card rendering is ported from
[jtoh.pro](https://github.com/jacobhumston/jtoh.pro)'s ETOH card generator (`src/gens/etoh.ts`),
minus the pieces that need that site's database (leaderboard ranks, custom backgrounds, login).

## Run

```bash
cd tower-profile
npm install
cp .env.example .env     # then put your TowerStats API key in it
npm start                # http://localhost:3000
```

You need a TowerStats API key (`TOWERSTATS_API_KEY`); it is sent as the `apiKey` header to
`https://api.towerstats.com/api/etoh`. Requires Node 18+.

## Usage

- Open `/`, type a username (or `!userId`), and click **Generate**.
- Direct image URL: `/api/profile?user=<name>` returns a 700x300 PNG
  (404 image for unknown users, 502 image if TowerStats fails).

## Notes

- Stats are cached in memory for 10 minutes; each IP is limited to 5 requests per 10 seconds.
- `npm test` runs offline tests with mocked Roblox/TowerStats responses.
- Fonts (Poppins, Twemoji, Material Symbols) and the default avatar/verified icons come from the jtoh.pro repo.
