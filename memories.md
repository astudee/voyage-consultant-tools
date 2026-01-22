# Voyage Consultant Tools - Project Memory

## Project Overview

**Voyage Consultant Tools** is a process consulting platform built for Voyage Advisory to analyze and transform business processes. The main application is a Next.js 16 app located in the `/map` directory.

**Deployment:** https://dev1.voyage.xyz

## Tech Stack

- **Frontend:** React 19, Next.js 16, TypeScript 5, Tailwind CSS 4
- **Visualization:** @xyflow/react (React Flow) for process maps
- **Database:** Snowflake
- **Authentication:** NextAuth
- **Export:** html2canvas + jsPDF for PDF generation

## Main Features

1. **Process Mapping** - Interactive visual process maps with grid-based swimlane layout (A-Z rows, numbered columns), drag-and-drop positioning, decision nodes
2. **Activity Analysis** - T-shirt sizing, task time/labor rate/volume calculations, status tracking, transformation plans (Eliminate/Automate/Optimize/Outsource)
3. **Cost Analysis** - Annual/monthly cost calculations with color-coded display modes
4. **PDF Export** - Multiple size options (A4, Poster, Plotter)
5. **Model with AI** - AI chatbot (Gemini/Claude) that can create/update/delete workflows, activities, swimlanes via natural language

## Key Directories

- `map/app/` - Pages and API routes
- `map/components/` - React components (ProcessMap, ActivityNode, DecisionNode, DetailPanel, ActivityForm, ExportMenu, Sidebar)
- `map/components/chat/` - AI chatbot UI components (ChatInterface, ChatMessage, ChatInput, ModelSelector)
- `map/lib/` - Contexts (WorkflowContext, SettingsContext), Snowflake connection, types
- `map/lib/ai/` - AI infrastructure (types, tools, system-prompt, gemini-provider, claude-provider)
- `map/public/` - Static assets including voyage-logo-white.png

## Database Tables (Snowflake)

- `workflows` - Workflow definitions
- `activities` - Core activity data (40+ fields)
- `swimlane_config` - Swimlane letter to name mappings
- `tshirt_config` - T-shirt sizing definitions
- `activity_audit_log` - Change tracking

## Recent Changes

- 2026-01-22: Implemented "Model with AI" chatbot feature (Gemini + Claude providers, 12 tools, streaming responses)
- 2026-01-22: Reorganized sidebar navigation order (Workflows, Swimlanes, Activities, Process Map, Resource Model, Model with AI, Settings)
- 2026-01-22: Created memories.md, set up devcontainer with Claude Code persistence

## Development Notes

- Run `npm run dev` from the `/map` directory to start the dev server
- App runs on http://localhost:3000
