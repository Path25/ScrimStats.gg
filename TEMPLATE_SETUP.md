
# ScrimStats.gg Template Setup Guide

This is a template project for ScrimStats.gg - a comprehensive League of Legends scrim and practice-block tracker.

## Quick Start

1. **Clone this template project**
2. **Set up Supabase integration**
3. **Configure environment variables**
4. **Deploy and customize**

## Supabase Setup

### 1. Create a new Supabase project
- Go to [supabase.com](https://supabase.com)
- Create a new project
- Note down your project URL and anon key

### 2. Update configuration
- Replace `your-project-id` in `supabase/config.toml` with your actual project ID
- The project ID is the first part of your Supabase URL (e.g., if your URL is `https://abcdefgh.supabase.co`, then `abcdefgh` is your project ID)

### 3. Environment Variables
The following environment variables will be automatically set when you connect to Supabase through Lovable:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

### 4. Database Schema
The database schema will be automatically created when you first connect to Supabase. This includes:
- User profiles and authentication
- Scrims and match tracking
- Player management
- API token system
- Game statistics storage

## Features Included

### ✅ Authentication System
- Email/password authentication
- User profiles and roles (admin, coach, player)
- Protected routes

### ✅ Scrim Management
- Create and manage scrims
- Track multiple games per scrim
- Game statistics integration
- Win/loss tracking

### ✅ Player Management
- Team roster management
- Player profiles and roles
- Summoner name tracking

### ✅ Dashboard & Analytics
- Customizable dashboard widgets
- Match history timeline
- Performance KPIs
- Visual statistics

### ✅ Calendar Integration
- Scrim scheduling
- Event management
- Monthly calendar view

### ✅ API Integration
- Riot API configuration
- Desktop app token system
- Game statistics ingestion

## Optional Integrations

### Riot API (Optional)
To enable Riot API features:
1. Get a Riot API key from [Riot Developer Portal](https://developer.riotgames.com/)
2. Configure it in Settings > API Configuration
3. Set your region (NA1, EUW1, etc.)

### Desktop Application
The template includes API endpoints for desktop applications to submit game statistics:
1. Generate API tokens in Settings > API Configuration
2. Use the provided endpoint URL in your desktop app
3. Include the token in Authorization header as Bearer token

## Customization

### Branding
- Update logo and colors in Settings > Appearance
- Modify theme configuration in `src/contexts/ThemeContext.tsx`
- Update meta tags in `index.html`

### Features
- All components are modular and can be customized
- Database schema can be extended as needed
- Dashboard widgets can be added or modified

## Deployment

This template is designed to work with:
- Lovable (recommended)
- Vercel
- Netlify
- Any modern hosting platform supporting React/Vite

## Support

For support and documentation:
- Visit [ScrimStats.gg](https://scrimstats.gg)
- Check the component documentation in `/src/components`
- Review the database schema in Supabase

## License

This template is provided as-is for creating League of Legends team management applications.
