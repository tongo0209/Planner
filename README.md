# Trip Planner

A comprehensive trip planning application built with React, TypeScript, Supabase, and Google Gemini AI.

## 🚀 Features

- **Trip Management**: Create, edit, and manage trips with participants
- **Financial Tracking**: Track expenses, contributions, and automatic debt settlement
- **AI-Powered Suggestions**: 
  - Timeline/itinerary suggestions powered by Gemini AI
  - Packing list recommendations
  - Real-time weather forecasts
- **Timeline Planning**: Day-by-day trip planning with live progress tracking
- **Weather Integration**: Real-time weather data with auto-refresh
- **Responsive Design**: Modern UI with dark mode and gradient aesthetics

## ⚡ Performance Optimizations

This app implements comprehensive performance optimizations:

### Code Splitting & Lazy Loading
- ✅ Dashboard and TripView components lazy loaded with React.lazy()
- ✅ Suspense boundaries with custom loading states
- ✅ Reduced initial bundle size

### React Optimizations
- ✅ React.memo() on all major components:
  - Dashboard, TripView, Finances, Timeline
  - Weather, PackingList, TripStats
- ✅ useMemo() for expensive computations:
  - Financial calculations (balances, debt settlement)
  - Timeline event grouping by day
- ✅ useCallback() for event handlers:
  - Prevents unnecessary re-renders
  - Stable function references for child components

### API & Data Caching
- ✅ In-memory cache for Gemini AI responses (SimpleCache class)
- ✅ Cached timeline suggestions (30min TTL)
- ✅ Cached packing list suggestions (60min TTL)
- ✅ Cached weather data (5min TTL)
- ✅ Reduces API calls and costs

### Custom Hooks
- ✅ useDebounce hook for search/input optimization
- ✅ Prevents excessive API calls and renders

### UI/UX Enhancements
- ✅ Modern gradient design system
- ✅ Smooth animations with Tailwind CSS
- ✅ Custom scrollbar with gradient
- ✅ Backdrop blur effects
- ✅ Loading states and spinners

## 🛠️ Tech Stack

- **Frontend**: React 19.2.0, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth)
- **AI**: Google Gemini 2.5 Flash
- **State Management**: React hooks (local state)

## 📦 Project Structure

```
Trip-Planner/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard (lazy loaded)
│   ├── TripView.tsx     # Trip detail view (lazy loaded)
│   ├── Finances.tsx     # Financial management
│   ├── Timeline.tsx     # Trip timeline
│   ├── Weather.tsx      # Weather widget
│   ├── PackingList.tsx  # Packing list
│   └── ui.tsx           # Reusable UI components
├── services/            # API services
│   ├── geminiService.ts # AI integration with caching
│   └── supabaseClient.ts# Database client
├── hooks/               # Custom React hooks
│   └── useDebounce.ts   # Debounce hook
├── types.ts             # TypeScript definitions
└── App.tsx              # Root component

```

## 🔧 Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `VITE_GEMINI_API_KEY`: Your Google Gemini API key

4. Run development server:
   ```bash
   npm run dev
   ```

## 🎯 Future Optimizations

Potential areas for further improvement:

- [ ] Virtual scrolling for long lists (React Window/Virtuoso)
- [ ] Service Worker for offline support
- [ ] IndexedDB for persistent caching
- [ ] Image optimization and lazy loading
- [ ] Route-based code splitting
- [ ] Web Workers for heavy computations
- [ ] Progressive Web App (PWA) features

## 📝 License

MIT
