# League of Legends Team Assistant (SCRIMSTATS.GG)

This project provides a platform for managing League of Legends team activities, including scrims, player stats, and scheduling.

ScrimStats.GG: League of Legends Team Assistant.

ScrimStats.GG is a comprehensive team management platform specifically designed for League of Legends esports teams. It provides coaches and players with tools to organize scrims (and other events), track player performance, and manage team activities.

## Core Features
*   Scrim Management
*   Player Roster Management
*   Calendar and Scheduling
*   Game Statistics Integration
*   User Role-Based Access
*   Dashboard Analytics

## Upcoming Features
*   Enhanced Performance Analytics
*   Team Communication Integration
*   Advanced Scheduling Features
*   Mobile Companion App
*   VOD Review Integration
*   Link recorded gameplay for analysis
*   Timestamped notes and feedback

## How to Work with This Code

This project is a standard Vite-based React application. You can work with the code using your preferred local development environment.

**Prerequisites:**
*   A GitHub Account: You'll need this to clone/fork the repository and for Netlify to access your code.
*   A Supabase Account: [Sign up free at Supabase](https://supabase.com).
*   A Netlify Account: [Sign up free at Netlify](https://www.netlify.com).

## Technologies Used

*   Vite
*   TypeScript
*   React
*   shadcn-ui
*   Tailwind CSS
*   Supabase (for backend services)
*   Netlify (for frontend hosting)

## Cloud-Based Self-Hosting Guide (Netlify + Supabase)

This guide explains how to deploy this application using Netlify for the frontend and Supabase for the backend, entirely through their respective web interfaces.

### **Part 0: Fork the Repository**

1.  **Go to the GitHub repository** for this project.
2.  Click the "**Fork**" button in the top-right corner. This creates a copy of the repository under your GitHub account. You'll deploy to Netlify from your forked repository.

### **Part 1: Setting Up Your Supabase Backend**

Your Supabase project will host the database, authentication, and backend functions.

**Step 1.1: Create a New Supabase Project**
1.  Go to your [Supabase Dashboard](https://app.supabase.com).
2.  Click "**New project**".
3.  Choose an organization (or create one).
4.  Enter a **Project name** (e.g., "MyLoLAppBackend").
5.  Create a strong **Database Password** and save it securely.
6.  Select a **Region** close to your intended users.
7.  Click "**Create new project**". Wait for your project to be provisioned.

**Step 1.2: Obtain Your Supabase API Credentials**
Once your Supabase project is ready:
1.  In your Supabase project dashboard, navigate to **Project Settings** (the gear icon).
2.  Go to the **API** section.
3.  Note down:
    *   **Project URL**: (e.g., `https://<your-project-ref>.supabase.co`). This is `VITE_SUPABASE_URL`.
    *   **Project API Key (anon public)**: This is `VITE_SUPABASE_ANON_KEY`. (If this is not visible please click the API button underneath the Project URL)

**Step 1.3: Set Up the Database Schema**
1.  In your Supabase project dashboard, go to the **SQL Editor**.
2.  Click "**+ New query**".
3.  Copy the *entire SQL script provided at the end of this README* (under "Appendix A: Supabase Database Schema SQL") and paste it into the query window.
4.  Click "**Run**". You should see a "Success" message.

**Step 1.4: Deploy Supabase Edge Functions (Manual Upload)**
Supabase Edge Functions handle backend logic like API interactions and data processing. You will deploy these manually.

1.  **Access the `supabase/functions` directory in your forked repository:**
    *   This directory contains subdirectories for each Edge Function (e.g., `get-api-configuration`, `receive-game-stats`, `set-api-configuration`, `test-riot-api`).
    *   Some function directory's (e.g., `supabase/functions/receive-game-stats/`) should contain an `index.ts` file (the main function code) and a `cors.ts` file (for CORS headers).

2.  **Upload each function to Supabase:**
    *   In your Supabase project dashboard, navigate to **Edge Functions** (the lambda icon on the left sidebar).
    *   For each function (`get-api-configuration`, `receive-game-stats`, `set-api-configuration`, `test-riot-api`):
        *   Click "**Deploy a new function**" then "**Via Editor**".
        *   Enter the **Function name** exactly as its directory name (e.g., `get-api-configuration`).
        *   After the function is created in the Supabase UI, you'll be in an online editor for that function. (If not click "Code" from the top menu)
        *   **Copy `index.ts` content:** Open the `index.ts` file from the corresponding function directory in your *local or GitHub repository view* (e.g., `supabase/functions/get-api-configuration/index.ts`). Copy its entire content. Paste this into the `index.ts` tab in the Supabase Edge Function editor.
        *   **Create and copy `cors.ts` content:** In the Supabase Edge Function editor, click the "Add file" obutton to create a new file. Rename this file `cors.ts`. Open the `cors.ts` file from the same function directory in your *local or GitHub repository view* (e.g., `supabase/functions/get-api-configuration/cors.ts`). Copy its entire content. Paste this into the newly created `cors.ts` tab in the Supabase Edge Function editor.
        *   Click "**Save and Deploy**" (or similar) for the function. Repeat for all Edge Functions.

**Step 1.5: Configure Edge Function Secrets in Supabase**
1.  Go to **Project Settings** > **Edge Functions** (under Project Settings in your Supabase dashboard).
2.  Review and add the following secrets.
    *   `SUPABASE_URL`: Your Supabase Project URL (from Step 1.2). This is usually pre-configured by Supabase. Verify it's correct.
    *   `SUPABASE_ANON_KEY`: Your Supabase `anon public` key (from Step 1.2). This is also usually pre-configured. Verify it's correct.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase `service_role secret` key (from Step 1.2). **This is a very sensitive key.** This is also usually pre-configured. Verify it's correct.
    *   `RIOT_API_KEY`: For the initial setup, enter a placeholder value like `NOT_SET_YET`. This value is required for the secret to be saved. The actual Riot API key will be configured later through the application's settings page by an admin.

### **Part 2: Setting Up Your Frontend on Netlify**

Netlify will host your frontend application.

**Step 2.1: Deploy from Github on Netlify**
1.  From your Netlify dashboard, click "**Add new project**" > "**Import an existing project**".
2.  Connect to **GitHub**.
3.  Select your forked GitHub repository.

**Step 2.2: Configure Build Settings on Netlify**
*   **Branch to deploy**: `main` (or your default branch).
*   **Build command**: `npm run build`
*   **Publish directory**: `dist`

**Step 2.3: Set Environment Variables on Netlify**
Go to **Site settings > Build & deploy > Environment variables**. Click "**Edit variables**".
Add:
*   **Key**: `VITE_SUPABASE_URL`, **Value**: Your Supabase Project URL (from Supabase Step 1.2).
*   **Key**: `VITE_SUPABASE_ANON_KEY`, **Value**: Your Supabase `anon public` key (from Supabase Step 1.2).
Save the variables.

**Step 2.4: Deploy Your Site**
1.  Click "**Deploy site**" (or "Deploy [your-repo-name]") on Netlify.
2.  Netlify will build and deploy your application.
3.  Once deployed, Netlify provides a URL (e.g., `your-site-name.netlify.app`).

### **Part 3: Initial Application Configuration**

**Step 3.1: Your First User is an Admin**
1.  Open your deployed application using the Netlify URL.
2.  Navigate to the **Register** page and sign up. The first registered user is automatically assigned the 'admin' role.

**Step 3.2: (Optional) Adjust Supabase Authentication Settings**
1.  In your Supabase Dashboard, go to **Authentication** > **Providers**.
2.  Under **Email**, toggle off "**Confirm email**" for easier sign up. (If enabled the confirm email link will lead to a page it cannot load but it still accepts the confirmation)

**Step 3.3: Configure Riot API Key in the Application** (Optional, feature usage coming very soon)
1.  Log in to your deployed application with the admin account.
2.  Navigate to the **Settings** page.
3.  Under **API Configuration** or **Riot API Settings**, enter your **Riot API Key** (from the [Riot Developer Portal](https://developer.riotgames.com/)) and region.
4.  Save. This stores the key in the `api_configurations` table in Supabase and updates the `RIOT_API_KEY` Edge Function secret.

### **Part 4: (Optional) Desktop Application Integration for Game Stats**

If using the desktop application to send game stats:
*   **Server URL**: This is the API Server URL (in web app Settings > API Token Manager).
*   **API Token**: `Bearer YOUR_PLAYER_API_TOKEN` (Tokens generated by Admin/Coach in web app Settings > API Token Manager).
*   **Scrim Game ID**: Located inside a scrim under your games

### **Troubleshooting**

*   **App Not Loading / Supabase Connection Errors**:
    *   Verify `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in Netlify environment variables.
*   **Data Not Saving/Loading**:
    *   Confirm SQL script (Step 1.3) ran successfully.
    *   Check Row Level Security (RLS) policies in Supabase.
    *   Check browser console logs.
*   **Edge Function Errors**:
    *   Check Edge Function logs in Supabase Dashboard.
    *   Ensure secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RIOT_API_KEY`) are correctly set in Supabase Project Settings > Edge Functions as per Step 1.5.
*   **Netlify Deploy Fails**:
    *   Review Netlify deploy log for errors.

---

## Appendix A: Supabase Database Schema SQL

```sql
-- PART 0: Enum Types (Run these first if they don't exist)
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'coach', 'player'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.api_config_type AS ENUM ('RIOT', 'GRID'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.calendar_event_type AS ENUM ('scrim', 'tournament', 'vod_review', 'team_meeting', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.game_result_enum AS ENUM ('Win', 'Loss', 'N/A'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.scrim_status_enum AS ENUM ('Scheduled', 'Completed', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- PART 1: Table Structures
-- Define all table structures first.

-- Profiles Table Structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ign TEXT, -- In-Game Name (e.g., Summoner Name for League of Legends)
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Roles Table Structure
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- API Configurations Table Structure
CREATE TABLE IF NOT EXISTS public.api_configurations (
  api_type public.api_config_type NOT NULL PRIMARY KEY, -- e.g., 'RIOT' for Riot Games API
  config_data jsonb NOT NULL, -- Stores API key, region, etc.
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Player API Tokens Table Structure
CREATE TABLE IF NOT EXISTS public.player_api_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Note: This references profiles(id)
    token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Players Table Structure
CREATE TABLE IF NOT EXISTS public.players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL, -- User who created/manages this player entry (typically coach/admin)
    summoner_name TEXT NOT NULL,
    role TEXT NOT NULL, -- e.g., Top, Jungle, Mid, ADC, Support
    team_tag TEXT,
    linked_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- Links to a profile if the player is a registered user
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scrim Recurrence Rules Table Structure
CREATE TABLE IF NOT EXISTS public.scrim_recurrence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- User who created this rule (coach/admin)
  rrule_string TEXT NOT NULL,
  series_start_date DATE NOT NULL,
  series_end_date DATE,
  start_time_template TIME WITHOUT TIME ZONE,
  opponent TEXT NOT NULL,
  patch_template TEXT,
  notes_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scrims Table Structure
CREATE TABLE IF NOT EXISTS public.scrims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- User who created/manages this scrim (typically coach/admin)
  scrim_date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE,
  opponent TEXT NOT NULL,
  patch TEXT, -- e.g., League of Legends game patch version
  status scrim_status_enum NOT NULL DEFAULT 'Scheduled'::scrim_status_enum,
  overall_result TEXT, -- e.g., "2-1 Win"
  notes TEXT,
  recurrence_rule_id UUID REFERENCES public.scrim_recurrence_rules(id) ON DELETE SET NULL, -- For recurring scrims
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scrim Games Table Structure
CREATE TABLE IF NOT EXISTS public.scrim_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- User who entered this game's data (coach/admin)
  scrim_id uuid NOT NULL REFERENCES public.scrims(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  result game_result_enum NOT NULL DEFAULT 'N/A'::game_result_enum,
  duration TEXT, -- e.g., "35:20"
  blue_side_pick TEXT, -- Champion picked by blue side (if applicable, or map for other games)
  red_side_pick TEXT,  -- Champion picked by red side (if applicable, or map for other games)
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game Stats Table Structure
CREATE TABLE IF NOT EXISTS public.game_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrim_game_id uuid NOT NULL REFERENCES public.scrim_games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- The player these stats belong to
  stat_type TEXT NOT NULL, -- e.g., "kills", "deaths", "assists", "champion_played"
  stat_value JSONB NOT NULL, -- Flexible to store various stat structures
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When the stat was recorded/received
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calendar Events Table Structure
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, -- User who created event (coach/admin)
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE,
  end_time TIME WITHOUT TIME ZONE,
  type calendar_event_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PART 1.5: Core Helper Functions (Define after tables, before RLS policies that use them)
-- Function to check user roles (used in RLS policies to prevent recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$;

-- PART 2: Row Level Security (RLS) Policies and Table Alterations
-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by users who created them." ON public.profiles;
CREATE POLICY "Profiles are viewable by users who created them." ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins and Coaches can view all profiles" ON public.profiles;
CREATE POLICY "Admins and Coaches can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
  )
);

-- RLS for User Roles (Updated to use has_role to prevent recursion)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop old policies first to ensure a clean state if this script is re-run
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Coaches can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles; -- New policy name
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles; -- New policy name
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles; -- New policy name
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles; -- New policy name


CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches can view roles" ON public.user_roles
FOR SELECT USING (public.has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS for API Configurations
ALTER TABLE public.api_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin/Coach can manage API configurations" ON public.api_configurations;
CREATE POLICY "Admin/Coach can manage API configurations" ON public.api_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
    )
  );

-- RLS for Player API Tokens
ALTER TABLE public.player_api_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own active tokens" ON public.player_api_tokens;
CREATE POLICY "Users can view their own active tokens" ON public.player_api_tokens
    FOR SELECT USING (auth.uid() = user_id AND is_active = TRUE);
DROP POLICY IF EXISTS "Admins and Coaches can manage all tokens" ON public.player_api_tokens;
CREATE POLICY "Admins and Coaches can manage all tokens" ON public.player_api_tokens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
        )
    );

-- RLS for Players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins and Coaches can manage players" ON public.players;
CREATE POLICY "Admins and Coaches can manage players" ON public.players
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
        )
    );
DROP POLICY IF EXISTS "Authenticated users can view players" ON public.players;
CREATE POLICY "Authenticated users can view players" ON public.players
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS for Scrim Recurrence Rules
ALTER TABLE public.scrim_recurrence_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin/Coach can manage scrim recurrence rules" ON public.scrim_recurrence_rules;
CREATE POLICY "Admin/Coach can manage scrim recurrence rules" ON public.scrim_recurrence_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
    )
  );
DROP POLICY IF EXISTS "Players can view scrim recurrence rules" ON public.scrim_recurrence_rules;
CREATE POLICY "Players can view scrim recurrence rules" ON public.scrim_recurrence_rules
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid()));

-- RLS for Scrims
ALTER TABLE public.scrims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users with coach/admin role can manage scrims" ON public.scrims;
CREATE POLICY "Users with coach/admin role can manage scrims" ON public.scrims
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
    )
  );
DROP POLICY IF EXISTS "Players can view scrims" ON public.scrims;
CREATE POLICY "Players can view scrims" ON public.scrims
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid()));

-- RLS for Scrim Games
ALTER TABLE public.scrim_games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users with coach/admin role can manage scrim games" ON public.scrim_games;
CREATE POLICY "Users with coach/admin role can manage scrim games" ON public.scrim_games
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
    )
  );
DROP POLICY IF EXISTS "Players can view scrim games" ON public.scrim_games;
CREATE POLICY "Players can view scrim games" ON public.scrim_games
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid()));

-- RLS for Game Stats
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coaches/Admins can manage stats" ON public.game_stats;
CREATE POLICY "Coaches/Admins can manage stats" ON public.game_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur_viewer
      WHERE ur_viewer.user_id = auth.uid() AND (ur_viewer.role = 'admin' OR ur_viewer.role = 'coach')
    )
  );
DROP POLICY IF EXISTS "Players can view their own stats" ON public.game_stats;
CREATE POLICY "Players can view their own stats" ON public.game_stats
  FOR SELECT USING (auth.uid() = user_id);

-- RLS for Calendar Events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users with coach/admin role can manage calendar events" ON public.calendar_events;
CREATE POLICY "Users with coach/admin role can manage calendar events" ON public.calendar_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid() AND (user_roles.role = 'admin' OR user_roles.role = 'coach')
    )
  );
DROP POLICY IF EXISTS "Players can view calendar events" ON public.calendar_events;
CREATE POLICY "Players can view calendar events" ON public.calendar_events
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid()));

-- PART 3: Functions and Triggers

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables that need updated_at automatically handled
-- For profiles table
DROP TRIGGER IF EXISTS set_timestamp_profiles ON public.profiles;
CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- For user_roles table
DROP TRIGGER IF EXISTS set_timestamp_user_roles ON public.user_roles;
-- CREATE TRIGGER set_timestamp_user_roles -- No updated_at column in user_roles by default, add if needed

-- For api_configurations table
DROP TRIGGER IF EXISTS set_timestamp_api_configurations ON public.api_configurations;
CREATE TRIGGER set_timestamp_api_configurations
BEFORE UPDATE ON public.api_configurations
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- For player_api_tokens table
DROP TRIGGER IF EXISTS set_timestamp_player_api_tokens ON public.player_api_tokens;
CREATE TRIGGER set_timestamp_player_api_tokens
BEFORE UPDATE ON public.player_api_tokens
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- For players table
DROP TRIGGER IF EXISTS set_timestamp_players ON public.players;
CREATE TRIGGER set_timestamp_players
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- For scrim_recurrence_rules table
DROP TRIGGER IF EXISTS set_timestamp_scrim_recurrence_rules ON public.scrim_recurrence_rules;
CREATE TRIGGER set_timestamp_scrim_recurrence_rules
BEFORE UPDATE ON public.scrim_recurrence_rules
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- For scrims table
DROP TRIGGER IF EXISTS set_timestamp_scrims ON public.scrims;
CREATE TRIGGER set_timestamp_scrims
BEFORE UPDATE ON public.scrims
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- For scrim_games table
DROP TRIGGER IF EXISTS set_timestamp_scrim_games ON public.scrim_games;
CREATE TRIGGER set_timestamp_scrim_games
BEFORE UPDATE ON public.scrim_games
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- For game_stats table
DROP TRIGGER IF EXISTS set_timestamp_game_stats ON public.game_stats;
CREATE TRIGGER set_timestamp_game_stats
BEFORE UPDATE ON public.game_stats
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

-- For calendar_events table
DROP TRIGGER IF EXISTS set_timestamp_calendar_events ON public.calendar_events;
CREATE TRIGGER set_timestamp_calendar_events
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();


-- Handle New User Trigger Function (Creates profile and assigns roles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _is_first_admin BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, ign)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'ign' -- IGN (Summoner Name) from registration metadata
  );

  -- Assign 'player' role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player');

  -- Check if any admin user already exists (excluding the new user being processed)
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin' AND user_id != NEW.id) INTO _is_first_admin;

  IF _is_first_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING; -- Avoid error if role somehow already exists
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger on auth.users to call handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
