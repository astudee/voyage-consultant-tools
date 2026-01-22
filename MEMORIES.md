# Claude Session Memory - Voyage Consultant Tools

## Project Overview
**Purpose:** Building process transformation tools for Voyage Advisory
**Tech Stack:**
- Next.js 16.1.4 with React 19
- TypeScript
- Snowflake database backend
- Vercel deployment
- Tailwind CSS

**URLs:**
- Production: https://dev1.voyage.xyz
- Vercel: https://voyage-consultant-tools.vercel.app

**Related Project:** voyage-app-store (similar stack, at https://apps.voyage.xyz)

---

## Session History

### January 22, 2026

#### Authentication Implementation
- Added NextAuth with credentials provider
- Users stored in `AUTH_USERS` env var as `username:password,username:password`
- Environment variables set in Vercel:
  - `NEXTAUTH_SECRET` - JWT signing secret
  - `NEXTAUTH_URL` - https://dev1.voyage.xyz
  - `AUTH_USERS` - astudee and ododds accounts (passwords to be updated)
- Using Next.js 16 `proxy.ts` pattern (not deprecated middleware.ts)
- Login page at `/login` with Voyage branding
- Sidebar hides on login page

**Key files:**
- `map/proxy.ts` - Auth redirect logic
- `map/lib/auth.ts` - NextAuth configuration
- `map/app/api/auth/[...nextauth]/route.ts` - NextAuth API handler
- `map/app/login/page.tsx` - Login page UI
- `map/components/SessionProvider.tsx` - Client session wrapper

#### Snowflake Connection (already working)
- Environment variables: SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PASSWORD, SNOWFLAKE_WAREHOUSE, SNOWFLAKE_DATABASE, SNOWFLAKE_SCHEMA
- Connection module: `map/lib/snowflake.ts`
- Tables: workflows, activities, swimlane_config, tshirt_config, activity_audit_log

#### Vercel Configuration
- Project: voyage-consultant-tools (NOT "map" - that was a mistake, deleted)
- Root directory: `map`
- Token for CLI: `gcsACrDUYSjDtKnf0EQda6f3`

---

## Database Schema

### Core Tables
- **workflows** - id, workflow_name, description, created/modified metadata
- **activities** - Full activity data including:
  - Basic: activity_name, activity_type (task|decision), grid_location, connections (JSON)
  - T-shirt sizing: task_time_size/midpoint/custom, labor_rate_size/midpoint/custom, volume_size/midpoint/custom
  - Transformation: transformation_plan, phase, status, projected_annual_savings
  - Data quality: data_confidence, data_source
- **swimlane_config** - Swimlane letters (A-J) mapped to names
- **tshirt_config** - Size definitions (XS, S, M, L, XL, XXL) for task_time, labor_rate, volume

---

## Brand Colors (Voyage Advisory)
```javascript
const brandColors = {
  darkCharcoal: '#333333',
  darkBlue: '#336699',
  mediumBlue: '#6699cc',
  teal: '#669999',
  gray: '#999999',
};
```
- Sidebar: teal background (#669999)
- Active state: dark blue (#336699)
- Buttons: dark blue (#0D3B66)

#### Renamed "Process Map" to "Process Transformation"
- Updated sidebar nav label
- Updated page title in layout.tsx
- Updated header in main page.tsx

#### Fixed Custom Override Persistence (UX Bug)
- Issue: When user selected "Other" for task time/labor rate/volume and entered a custom value, the value was saved but not displayed when returning to edit
- Root cause: Form initialized size as empty when activity had custom value but no size, so "Other" wasn't selected and custom input didn't show
- Fix: Added `getInitialSize()` helper in ActivityForm.tsx that detects custom values and sets size to "Other" automatically

---

## Known Issues / TODOs
- (none currently)

---

## Useful Commands
```bash
# Deploy to Vercel
npx vercel --prod --token gcsACrDUYSjDtKnf0EQda6f3

# Check deployments
npx vercel ls --yes --token gcsACrDUYSjDtKnf0EQda6f3

# Add env variable
npx vercel env add VARIABLE_NAME production --token gcsACrDUYSjDtKnf0EQda6f3

# Local development
cd map && npm run dev
```
