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

#### Updated Activities Page Columns
- New column order: ID, Name, Type, Swimlane, Avg Time, Volume/Mo, Labor Rate, Monthly Cost, Annual Cost, Plan, Status, Actions
- Added new columns: Avg Time (minutes), Volume/Mo, Labor Rate ($/hr)
- Removed Phase column
- Activity name now links directly to edit page
- All numeric columns are sortable
- Footer shows activity count

#### Model with AI - Chatbot Implementation (Commit: 13004b8)
Implemented AI-powered chatbot that can perform actions within the app.

**Features:**
- Dual AI provider support: Gemini (faster/cheaper) and Claude (smarter)
- 12 tools for managing workflows, activities, and swimlanes
- Streaming responses with real-time tool execution feedback
- Topic restriction (AI redirects off-topic questions)
- Session-only chat history (no database persistence)

**New Files Created:**
```
map/lib/ai/
├── types.ts           # Type definitions (ChatMessage, ToolCall, AIProvider, etc.)
├── tools.ts           # Tool registry with 12 tools + executors
├── system-prompt.ts   # System prompt generator
├── gemini-provider.ts # Gemini API with streaming + tool calling
└── claude-provider.ts # Claude API with streaming + tool calling

map/components/chat/
├── ChatInterface.tsx  # Main chat container
├── ChatMessage.tsx    # Message display with tool status
├── ChatInput.tsx      # Auto-resizing input with send button
└── ModelSelector.tsx  # Gemini/Claude toggle

map/app/api/chat/route.ts    # Streaming chat API endpoint
map/app/model-with-ai/page.tsx  # Chat page
```

**Available AI Tools:**
| Tool | Description |
|------|-------------|
| `list_workflows` | List all workflows |
| `create_workflow` | Create workflow (name, description) |
| `update_workflow` | Update workflow (id, name, description) |
| `delete_workflow` | Delete workflow (id) |
| `list_activities` | List activities in workflow |
| `create_activity` | Create activity (workflowId, name, grid_location, + optional fields) |
| `update_activity` | Update activity |
| `delete_activity` | Delete activity |
| `list_swimlanes` | List swimlanes in workflow |
| `create_swimlane` | Create swimlane (workflowId, letter, name) |
| `update_swimlane` | Update swimlane |
| `get_tshirt_config` | Get t-shirt sizing options |

**Dependencies Added:**
- `@google/generative-ai` - Gemini SDK
- `@anthropic-ai/sdk` - Claude SDK

**Environment Variables Required:**
- `GOOGLE_AI_API_KEY` - Gemini API key
- `ANTHROPIC_API_KEY` - Claude API key

#### Sidebar Navigation Reorganized
New order (top to bottom):
1. Workflows
2. Swimlanes
3. Activities
4. Process Map
5. Resource Model
6. Model with AI (NEW)
7. Settings (at bottom, collapsible)

#### Vercel "web" Project Deleted
- A rogue project named "web" was found on Vercel (prj_nLFXDLr6xEcIAP1nBvRPn0y2YhIn)
- It was NOT connected to this repo - commits didn't match
- Was deployed via CLI from a different project
- URL was https://web-one-kappa-90.vercel.app
- User deleted it manually

---

## Known Issues / TODOs
- (none currently)

---

## Vercel Projects (astudees-projects team)
| Project | URL | Purpose |
|---------|-----|---------|
| voyage-consultant-tools | https://dev1.voyage.xyz | This app (Process Transformation) |
| voyage-app-store-vercel | https://apps.voyage.xyz | Related app store project |

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
