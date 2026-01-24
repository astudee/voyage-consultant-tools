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
- Triple AI provider support: Gemini (fastest), Claude (smartest), ChatGPT (nicest)
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
├── claude-provider.ts # Claude API with streaming + tool calling
└── openai-provider.ts # OpenAI (ChatGPT) API with streaming + tool calling

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
- `openai` - OpenAI SDK

**Environment Variables Required:**
- `GOOGLE_AI_API_KEY` - Gemini API key
- `ANTHROPIC_API_KEY` - Claude API key
- `CHATGPT_API_KEY` - OpenAI/ChatGPT API key

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

### January 23, 2026

#### Fixed Model with AI - Gemini and Claude Tool Errors

**Issue 1: Gemini 404 Error**
- Error: `models/gemini-1.5-flash is not found for API version v1beta`
- Root cause: Model name `gemini-1.5-flash` was deprecated
- Fix: Updated to `gemini-2.0-flash` in `map/lib/ai/gemini-provider.ts:127`

**Issue 2: Claude Tool Calls Returning HTML (JSON parse error)**
- Error: `Unexpected token '<', "<!doctype "... is not valid JSON`
- Root cause: AI tools were making HTTP requests to internal API endpoints (`/api/workflows`, etc.), but these were blocked by authentication middleware (proxy.ts) which redirected to `/login` (HTML response)
- Fix: Rewrote `map/lib/ai/tools.ts` to call Snowflake functions directly instead of making HTTP requests
  - Removed `getBaseUrl()` function and all `fetch()` calls
  - Imported Snowflake functions directly from `../snowflake`
  - Each tool case now calls the appropriate Snowflake function

**Key file changes:**
- `map/lib/ai/gemini-provider.ts` - Updated model name
- `map/lib/ai/tools.ts` - Complete rewrite of `executeTool()` function

#### Created "Field Services - Distribution" Workflow (ID: 2)

**Description:** Comprehensive utility distribution workflow from asset assessment through closeout. Includes 3-4 year planning cycle for permits and engineering, execution phase with procurement and outage planning, and field execution with closeout.

**Swimlanes (8 total):**
| Letter | Name |
|--------|------|
| A | Asset Management |
| B | Engineering |
| C | Permitting |
| D | Outage Planning |
| E | Procurement |
| F | Work Management |
| G | Production/Field Ops |
| H | Closeout |

**Activities (15 total) with T-Shirt Sizing:**

| Location | Name | Type | Connects To | Time | Rate | Vol |
|----------|------|------|-------------|------|------|-----|
| A1 | Identify Assets for Replacement | task | B1 | L | L | M |
| B1 | Initial Engineering Design | task | C1, B2 | XL | XL | M |
| C1 | File Permit Applications | task | C2 | M | M | M |
| C2 | Permits Approved? | decision | B2, C1 | XS | M | M |
| B2 | Final Engineering Review | task | D1, E1 | L | XL | M |
| D1 | Plan Outage | task | D2 | M | L | M |
| D2 | Outage Approved? | decision | F1, D1 | XS | L | M |
| E1 | Order Materials | task | E2 | S | M | L |
| E2 | Materials Available? | decision | F1, E1 | XS | S | L |
| F1 | Create Work Order | task | F2 | S | M | L |
| F2 | Schedule & Dispatch Crew | task | G1 | S | M | L |
| G1 | Execute Field Work | task | G2 | XXL | L | M |
| G2 | Weather/Emergency Hold? | decision | H1, F2 | XS | L | S |
| H1 | Final Inspection | task | H2 | M | L | M |
| H2 | Documentation & Closeout | task | (end) | M | M | M |

**T-Shirt Sizing Key:**
- **Task Time**: XS (<5min), S (5-15min), M (15-60min), L (1-4hrs), XL (4-8hrs), XXL (>8hrs)
- **Labor Rate**: S ($30-50/hr), M ($50-75/hr), L ($75-100/hr), XL ($100-150/hr)
- **Volume**: S (10-50/mo), M (50-200/mo), L (200-500/mo)

**Connections Format (JSON):**
- Tasks: `[{"next": "B1"}]`
- Decisions: `[{"condition": "Approved", "next": "B2"}, {"condition": "Denied", "next": "C1"}]`

Note: Connections field requires JSON format for UI to display "Next Activity" properly.

**Workflow Flow Logic:**
- Early Phase (Years 1-3): A1 Asset Assessment → B1 Engineering Design → C1 File Permits (parallel with engineering)
- Execution Phase (Year 4): C2 Permit Approval → B2 Final Engineering → D1 Outage Planning + E1 Procurement
- Field Phase: F1-F2 Work Management → G1 Field Execution → H1-H2 Closeout
- Decision points: C2 Permits Approved?, D2 Outage Approved?, E2 Materials Available?, G2 Weather/Emergency Hold?
- Feedback loops for denied permits, denied outages, weather constraints, emergency reassignments

---

### January 24, 2026

#### Added ChatGPT as Third AI Provider

Added OpenAI's ChatGPT (GPT-4o) as a third AI provider option in the Model with AI feature.

**Provider Labels:**
- Gemini: "(fastest)"
- Claude: "(smartest)"
- ChatGPT: "(nicest)"

**Files Created/Modified:**
- `map/lib/ai/openai-provider.ts` - New OpenAI provider with streaming + tool calling
- `map/lib/ai/types.ts` - Added 'chatgpt' to AIProvider type
- `map/components/chat/ModelSelector.tsx` - Added ChatGPT button
- `map/app/api/chat/route.ts` - Added ChatGPT route handling

**New Dependency:**
- `openai` - OpenAI SDK

**New Environment Variable:**
- `CHATGPT_API_KEY` - Required for ChatGPT functionality (already configured in Vercel)

---

## Time Study Feature (Started January 24, 2026)

### Overview
A new feature for conducting time and motion studies on workflow activities. Located in left nav under "Resource Model".

### Key Concepts
- **Template**: Reusable time structure (Simple Timer, Contact Center Basic, Contact Center Elements, Queue/Transaction, Field Service, Field Service Detailed). Defines timing type:
  - `simple` - basic start/stop
  - `phases` - sequential steps
  - `segments` - flexible order, can revisit
- **Study**: Configured observation exercise linked to a workflow. Created via wizard (basics → activities → time structure → flags → review)
- **Session**: One observer sitting down to observe a worker. Captures observer name, worker name, date.
- **Observation**: One timed work item with activity, duration (or step-level timestamps), outcome (Complete/Transferred/Pended), flags, notes, opportunities.

### Database Tables (VOYAGE_CONSULTANT_TOOLS.PUBLIC)
| Table | Purpose |
|-------|---------|
| TIME_STUDY_TEMPLATES | Reusable time structure definitions (6 system templates seeded) |
| TIME_STUDY_TEMPLATE_STEPS | Steps for phases/segments templates |
| TIME_STUDIES | Configured observation exercises linked to workflows |
| TIME_STUDY_STEPS | Study-specific steps (copied from template, customizable) |
| TIME_STUDY_ACTIVITIES | Activities available for a study (from workflow or ad-hoc) |
| TIME_STUDY_FLAGS | Flags available for a study (e.g., "Automatable") |
| TIME_STUDY_OUTCOMES | Outcomes for a study (Complete, Transferred, Pended) |
| TIME_STUDY_SESSIONS | Observer sessions |
| TIME_STUDY_OBSERVATIONS | Individual timed work items |
| TIME_STUDY_OBSERVATION_FLAGS | Many-to-many: observations ↔ flags |
| TIME_STUDY_OBSERVATION_STEPS | Step timestamps within an observation |

### Database Views (4 views)
| View | Purpose |
|------|---------|
| TIME_STUDY_OBSERVATION_STEP_TOTALS | Aggregates step revisits per observation |
| TIME_STUDY_SUMMARY | Study-level statistics (sessions, observations, duration stats) |
| TIME_STUDY_ACTIVITY_SUMMARY | Activity-level stats within a study |
| TIME_STUDY_STEP_SUMMARY | Step-level stats for segment-based studies |

### Seeded Templates (6 templates, 21 steps total)
| Template | Structure Type | Steps |
|----------|---------------|-------|
| Simple Timer | simple | (none) |
| Contact Center Basic | phases | Call Start → Call End → ACW End |
| Contact Center Elements | segments | Greeting, Security, Problem ID, Research, Resolution, Wrap-up, ACW |
| Queue/Transaction | simple | (none) |
| Field Service | phases | Travel → Arrive → Work → Complete |
| Field Service Detailed | segments | Travel, Site Assessment, Prep, Main Work, Testing, Cleanup, Documentation |

### Snowflake Permissions
- Views were created using VOYAGE_APP_ROLE after granting that role to ASTUDEE
- The app user (VOYAGE_APP_USER) connects via VOYAGE_APP_ROLE which owns all tables
- ACCOUNTADMIN needed VOYAGE_APP_ROLE granted to create views that reference tables owned by that role

### Key Design Decisions
- Templates define reusable time structures (simple, phases, segments)
- Studies copy template steps and can customize; link to workflow but ad-hoc activities don't pollute process map
- Segments can be revisited multiple times (tracked via visit_number and sequence_in_observation)
- Phases are sequential but steps can be skipped
- Observations capture outcome (Complete/Transferred/Pended), flags, notes, and opportunities

### Implementation Status
**Database:** ✅ Complete (11 tables, 4 views, 6 seeded templates)
**API Layer:** ✅ Complete
**Study List Page:** ✅ Complete
**Left Nav:** ✅ Complete
**Study Setup Wizard:** ✅ Complete
**Session Start Screen:** ✅ Complete
**Observation Screen with Timer:** ✅ Complete
**Coding Modal:** ✅ Complete
**Study Summary Dashboard:** ✅ Complete

**Completed Files:**
- `map/lib/time-study-types.ts` - TypeScript type definitions
- `map/lib/snowflake-time-study.ts` - Snowflake API layer (CRUD for all entities + summary stats)
- `map/app/api/time-study/templates/route.ts` - GET templates
- `map/app/api/time-study/studies/route.ts` - GET/POST studies
- `map/app/api/time-study/studies/[id]/route.ts` - GET/PUT/DELETE study
- `map/app/api/time-study/studies/[id]/sessions/route.ts` - GET/POST sessions
- `map/app/api/time-study/studies/[id]/activities/route.ts` - GET/POST activities
- `map/app/api/time-study/studies/[id]/flags/route.ts` - GET/POST flags
- `map/app/api/time-study/studies/[id]/outcomes/route.ts` - GET/POST outcomes
- `map/app/api/time-study/studies/[id]/summary/route.ts` - GET summary stats
- `map/app/api/time-study/sessions/[id]/route.ts` - GET/PUT session
- `map/app/api/time-study/sessions/[id]/observations/route.ts` - GET/POST observations
- `map/app/api/time-study/observations/[id]/route.ts` - GET/PUT observation
- `map/app/time-study/page.tsx` - Study List page
- `map/components/Sidebar.tsx` - Added Time Study nav item (clock icon)
- `map/app/time-study/new/page.tsx` - Study Setup Wizard (main container with useReducer state)
- `map/app/time-study/new/components/WizardStepper.tsx` - Progress stepper component
- `map/app/time-study/new/components/Step1Basics.tsx` - Name, workflow, template selection
- `map/app/time-study/new/components/Step2Activities.tsx` - Activity selection + ad-hoc
- `map/app/time-study/new/components/Step3TimeStructure.tsx` - Steps configuration (phases/segments)
- `map/app/time-study/new/components/Step4FlagsOutcomes.tsx` - Flags and outcomes selection
- `map/app/time-study/new/components/Step5Review.tsx` - Configuration summary before creation
- `map/app/time-study/[studyId]/session/new/page.tsx` - Session start form (observer name, worker name, date)
- `map/app/time-study/[studyId]/session/[sessionId]/observe/page.tsx` - Timer UI with step support
- `map/app/time-study/[studyId]/session/[sessionId]/observe/components/CodingModal.tsx` - Activity, outcome, flags, notes, opportunity coding
- `map/app/time-study/[studyId]/summary/page.tsx` - Study summary dashboard with overview, activities, steps, and sessions tabs

**Next Steps:**
1. ~~Add Time Study to left nav under Resource Model~~ ✅
2. ~~Build Study List page (list studies, create new, join existing)~~ ✅
3. ~~Build Study Setup Wizard (5 steps: Basics/Template → Activities → Time Structure → Flags/Outcomes → Review)~~ ✅
4. ~~Build Session Start screen (select study, enter observer/worker names)~~ ✅
5. ~~Build Observation screen with timer UI (adapts based on structure_type: simple, phases, segments)~~ ✅
6. ~~Build Coding Modal (activity, outcome, flags, notes, opportunity)~~ ✅
7. ~~Build Study Summary dashboard (stats by activity, segment, flag, disposition with min/max/avg/median)~~ ✅

### UI Screens (All Complete)
1. **Study list** ✅ - see all studies, create new, join existing
2. **Study setup wizard** ✅ - configure new study (basics → activities → time structure → flags → review)
3. **Study summary** ✅ - analytics dashboard with stats by activity, segment, flag, disposition
4. **Session start** ✅ - pick study, enter observer/worker
5. **Observation screen** ✅ - timer UI (adapts based on template type: simple, phases, segments)
6. **Coding modal** ✅ - classify each observation after stopping timer

### Key Reporting Views
- Overall stats (avg/median/min/max/stddev duration, disposition breakdown)
- By Activity (volume, time stats, disposition mix)
- By Segment (time per segment, skip rate, revisit rate)
- By Flag (frequency, time comparison vs overall)
- Opportunities logged (grouped/deduplicated improvement ideas)

---

## Known Issues / TODOs

### Time Study Feature (Potential Enhancements)
- **Export functionality**: Add CSV/Excel export for study data and observations
- **Edit observation**: Currently can only delete, no edit capability after saving
- **Bulk session management**: No way to archive or delete multiple sessions at once
- **Real-time sync**: Multiple observers timing same study could benefit from live updates
- **Mobile optimization**: Timer UI works but could be optimized for tablet/mobile use in field

### Verified Working (January 24, 2026)
- Build passes with no errors
- All routes registered correctly
- Authentication protecting API endpoints as expected

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
