import { Template } from './types-backend';

export const PREDEFINED_TEMPLATES: Template[] = [
  {
    id: 'sys-retrospective',
    name: 'Sprint Retrospective',
    summary: 'Sprint Retrospective — [Sprint Name/Number]',
    content: `# Sprint Retrospective: [Sprint Name/Number]

**Date:** [DD-MM-YYYY]  
**Facilitator:** [Name]  
**Participants:** @user1, @user2, ...  
**Sprint Goals (from planning):** [Short statement]

## Context & Signals
- **Scope / notable changes:** [e.g., team changes, incidents, vacations]
- **Key metrics (optional):** [velocity, lead time, bugs, uptime, etc.]
- **Demo/Release links (optional):** [link]

## What went well
*Things to repeat or scale.*
- [ ]

## What didn’t go well
*Pain points, bottlenecks, surprises.*
- [ ]

## Insights / Root causes
*Why did the problems happen? What patterns do we see?*
- [ ]

## Experiments / Improvements
*Small, testable changes for the next sprint.*
- [ ]

## Action items
| Action | Owner | Due | Status |
| :--- | :--- | :--- | :--- |
| [Describe a concrete next step] | @user | [DD-MM-YYYY] | [ ] |
| [Describe a concrete next step] | @user | [DD-MM-YYYY] | [ ] |

## Parking lot
*Topics to discuss later (not solved in this retro).*
- [ ]`
  },

  {
    id: 'sys-meeting-notes',
    name: 'Meeting Notes',
    summary: 'Meeting Notes — [Meeting Title] — [DD-MM-YYYY]',
    content: `# Meeting Notes: [Meeting Title]

**Date:** [DD-MM-YYYY]  
**Time:** [HH:MM–HH:MM]  
**Facilitator:** [Name]  
**Attendees:** @user1, @user2, ...  
**Goal:** [What do we want to achieve in this meeting?]

## Agenda
- [ ] [Topic 1]
- [ ] [Topic 2]

## Notes
*Key discussion points (capture context and rationale).*
- [ ]

## Decisions
| Decision | Rationale | Owner | Date |
| :--- | :--- | :--- | :--- |
| [What was decided] | [Why] | @user | [DD-MM-YYYY] |

## Action items
| Action | Owner | Due | Status |
| :--- | :--- | :--- | :--- |
| [Task / next step] | @user | [DD-MM-YYYY] | [ ] |
| [Task / next step] | @user | [DD-MM-YYYY] | [ ] |

## Risks / Open questions
- [ ]

## Next meeting
**Date (optional):** [DD-MM-YYYY]  
**Proposed topics:**
- [ ]`
  },

  {
    id: 'sys-prd',
    name: 'Product Requirements Document (PRD)',
    summary: 'PRD — [Project/Feature Name]',
    content: `# PRD: [Project/Feature Name]

| Status | Owner | Stakeholders | Target Release |
| :--- | :--- | :--- | :--- |
| Draft / In Review / Approved | @user | @user1, @user2 | [DD-MM-YYYY or Quarter] |

## Problem statement
*What problem are we solving? Who experiences it? Evidence?*
- [ ]

## Goals
*What outcomes do we want?*
- [ ]

## Non-goals
*What are we explicitly NOT doing now?*
- [ ]

## Users & use cases
- **Primary users:** [who]
- **Key use cases:**  
  - [Use case 1]  
  - [Use case 2]

## Scope
### In scope
- [ ]

### Out of scope
- [ ]

## Requirements
### Functional requirements
- **R1:** [Requirement]  
- **R2:** [Requirement]

### Non-functional requirements
*Performance, security, reliability, accessibility, compliance.*
- [ ]

### Edge cases
- [ ]

## UX / Design
- **Figma / mocks / prototype:** [link]
- **Copy / content notes (optional):** [ ]

## Data & analytics
- **Tracking plan:** [events, dashboards]
- **Success metrics:** [ ]

## Dependencies & risks
- **Dependencies:** [teams/systems]
- **Risks:** [what can go wrong?]
- **Mitigations:** [ ]

## Rollout plan
- **Feature flag / gating:** [yes/no, details]
- **Phased rollout:** [alpha → beta → GA]
- **Migration/backfill (if needed):** [ ]

## Acceptance criteria
*How do we know this is done?*
- [ ]

## Open questions
- [ ]`
  },

  {
    id: 'sys-one-on-one',
    name: '1-on-1 Meeting',
    summary: '1-on-1 — [Team Member] & [Lead] — [DD-MM-YYYY]',
    content: `# 1-on-1: [Team Member] & [Lead]

**Date:** [DD-MM-YYYY]  
**Cadence:** [weekly/biweekly]  
**Next check-in:** [DD-MM-YYYY]

## Quick check-in
- **Mood (1–10):** [ ]
- **Energy / workload:** [ ]
- **Top of mind:** [ ]

## Follow-up from last 1-on-1
| Item | Owner | Due | Status |
| :--- | :--- | :--- | :--- |
| [Previous action item] | @user | [DD-MM-YYYY] | [ ] |

## Team member agenda
*Wins, challenges, blockers, questions.*
- [ ]

## Lead agenda
*Context, updates, feedback, alignment.*
- [ ]

## Work & delivery
- **Current priorities:** [ ]
- **Blockers / risks:** [ ]
- **Support needed:** [ ]

## Feedback
- **To team member (SBI):** [Situation → Behavior → Impact]
- **To lead/team:** [Start / Stop / Continue]

## Growth & career
- **Goals (short-term):** [ ]
- **Goals (long-term):** [ ]
- **Development actions:** [courses, projects, mentorship]

## Action items
| Action | Owner | Due | Status |
| :--- | :--- | :--- | :--- |
| [Next step] | @user | [DD-MM-YYYY] | [ ] |
| [Next step] | @user | [DD-MM-YYYY] | [ ] |

## Notes (optional)
- [ ]`
  },

  {
    id: 'sys-incident-report',
    name: 'Incident Report (Post-Mortem)',
    summary: 'Incident Report — [Incident Title] — [DD-MM-YYYY]',
    content: `# Incident Report: [Incident Title]

**Incident ID:** [Optional]  
**Date:** [DD-MM-YYYY]  
**Severity:** [P0/P1/P2/P3]  
**Status:** Draft / Reviewed / Final  
**Authors:** @user  
**Services/Components:** [service-a, service-b]

## Executive summary
*What happened in 2–3 sentences, including the outcome.*
- [ ]

## Customer impact
- **Who was affected:** [users/orgs/region]
- **What was impacted:** [feature/API/availability/data]
- **Start–end time:** [DD-MM-YYYY HH:MM] – [DD-MM-YYYY HH:MM] (Timezone: [UTC/local])
- **Duration:** [e.g., 47 minutes]
- **User-visible symptoms:** [ ]

## Detection & response
- **How detected:** [alert, customer report, internal monitoring]
- **Time to detect (TTD):** [ ]
- **Time to mitigate (TTM):** [ ]
- **Comms:** [status page / email / internal channel links]

## Timeline
*Use consistent timezone.*
| Time | Event |
| :--- | :--- |
| [HH:MM] | Incident started |
| [HH:MM] | Detected ([alert/link]) |
| [HH:MM] | Mitigation applied |
| [HH:MM] | Fully resolved |
| [HH:MM] | Post-incident validation completed |

## Root cause
*What directly caused the incident? Include contributing factors.*
- [ ]

### 5 Whys (optional)
1. Why? [ ]
2. Why? [ ]
3. Why? [ ]
4. Why? [ ]
5. Why? [ ]

## Resolution
*What fixed it? What was rolled back/changed?*
- [ ]

## What went well / What didn’t
### Went well
- [ ]

### Didn’t go well
- [ ]

## Prevention & follow-ups
| Action | Type | Priority | Owner | Due | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Task] | Prevention / Detection / Process | High/Med/Low | @user | [DD-MM-YYYY] | [ ] |

## References
*Dashboards, logs, PRs, runbooks, tickets.*
- [ ]`
  }
];