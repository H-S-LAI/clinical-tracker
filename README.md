# Clinical Tracker

A mobile-first clinical logging app for medical students.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variable
The `.env.local` file already has your Google Apps Script URL.
If you need to update it, edit `.env.local`:
```
NEXT_PUBLIC_API_URL=your_apps_script_url_here
```

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:3000 on your phone (make sure both are on the same WiFi).

### 4. Deploy to Vercel (recommended)
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import your repo
3. Add environment variable: `NEXT_PUBLIC_API_URL` = your Apps Script URL
4. Deploy

Once deployed, open the URL on your iPhone → Share → Add to Home Screen.

## Features
- **Ward tab**: Patient cards with SOAP notes and follow-up tracking
- **OPD tab**: Per-visit logging with learning points
- **Pearls tab**: Quick capture of teaching pearls

## Structure
- `pages/index.js` — Main dashboard
- `pages/patient/[id].js` — Patient detail with SOAP
- `lib/api.js` — Google Sheets API calls
- `styles/globals.css` — All styling
