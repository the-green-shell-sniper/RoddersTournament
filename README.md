# CivilizedPool.com

CivilizedPool.com is a tiny GitHub Pages site that immediately sends visitors to the current Rodder's tournament signup page on DigitalPool.

## How It Works

Each tournament week runs from Friday 12:00:00 AM Pacific time through the following Thursday 11:59:59 PM Pacific time. The page always decides using `America/Los_Angeles`, so it follows Pacific calendar dates even when a visitor is elsewhere.

The normal patterns are:

- 1st Thursday: 8-Ball
- 2nd Thursday: 9-Ball
- 3rd Thursday: Ladies Night, alternating by month
- 4th Thursday: 8 and 9 Ball

Ladies Night alternates by month indefinitely. September 2026 is 8-ball, October 2026 is 9-ball, November 2026 is 8-ball, and so on. That means odd-numbered months are 8-ball and even-numbered months are 9-ball.

The redirect script checks `tournament-overrides.json` first for the exact tournament date. If there is an override URL, it uses that URL. If the override marks the date as cancelled, the site shows a cancellation message instead of redirecting. If the date is a fifth Thursday and there is no override, the site shows the safe fallback page.

## Adding Or Changing A Tournament

### Add a fifth-Thursday tournament

Add a new date key to `tournament-overrides.json` using `YYYY-MM-DD` and provide the full DigitalPool URL.

Important: this is only needed for fifth Thursdays or other special cases. The site already keeps working for future first, second, third, and fourth Thursdays without any new code or schedule updates.

Example:

```json
{
  "2026-10-29": {
    "url": "https://digitalpool.com/tournaments/rodders-fifth-thursday-open-10-ball-10292026/overview",
    "note": "Fifth Thursday - Open 10-Ball"
  }
}
```

### Override a normal week

Add the Thursday date as a new entry and supply your own URL. The script will use that URL instead of the normal 1st/2nd/3rd/4th pattern.

### Mark a tournament cancelled

Add the Thursday date with `cancelled: true` and an optional note.

```json
{
  "2026-12-24": {
    "cancelled": true,
    "note": "No tournament - Christmas Eve"
  }
}
```

## Testing Changes

Run the included verifier:

```bash
node tools/verify-redirect.mjs
```

You can also test from the browser console on the live site with:

```js
CivilizedPoolRedirect.evaluateTournamentDecision({
  now: new Date('2026-08-28T07:00:00Z'),
  overrides: {
    '2026-10-29': {
      url: 'https://digitalpool.com/tournaments/rodders-fifth-thursday-open-10-ball-10292026/overview',
      note: 'Fifth Thursday - Open 10-Ball'
    }
  }
});
```

That returns the decision object without redirecting the browser.

## GitHub Pages Setup

Use GitHub Pages with:

- Branch: `main`
- Folder: `/ (root)`
- Custom domain: `civilizedpool.com`

The `CNAME` file in this repository already contains `civilizedpool.com`.

## DNS Records You Will Need

For the apex domain `civilizedpool.com`, point these A records at GitHub Pages:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

For `www.civilizedpool.com`, create a CNAME to `civilizedpool.com`.

After DNS has propagated, enable HTTPS in GitHub Pages if it is not already active.

## Security Reminder

This is a public static site. Do not place API keys, tokens, secrets, or credentials anywhere in this repository.

## Reference Folder

`2026-08-26_RiverTournamentClone` is reference-only historical material. It is not part of the published CivilizedPool site and should be left untouched.
