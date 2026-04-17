# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Chrome extension (Manifest V3) that visualizes Salesforce field-level and object-level permissions across Profiles and Permission Sets in a side panel matrix view. Supports Excel export.

## Commands

```bash
# Development
npm run dev

# Build
npm run build    # runs tsc && vite build

# Integration test (requires SF credentials)
SF_TOKEN=... SF_URL=... npx tsx test-live.ts
```

## Architecture

- **Tech:** TypeScript + React 18 + Vite + @crxjs/vite-plugin (Chrome extension bundling)
- **UI:** TanStack React Virtual (virtualized matrix), XLSX (Excel export)
- **Extension pattern:** Manifest V3 — service worker + content script + side panel
- **Hooks:** `useSessionInfo`, `useSalesforceApi`, `useProfiles`, `usePermissionSets`, `useFieldPermissions`, `useObjectPermissions`
- **Key logic:** Permission resolver utility that merges field-level security from multiple profiles/permission sets into a unified matrix with color-coded access levels
- **Salesforce API:** SOQL queries for FieldPermissions, ObjectPermissions, Profile, PermissionSet objects. Communication via service worker message passing.
- **Source:** All code in `src/` — hooks, components (Matrix, Accordion, Selector, Export), utilities
