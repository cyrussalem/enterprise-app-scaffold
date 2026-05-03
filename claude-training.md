# Claude Training Notes

## Core LLM Constraints

We have entered the AI paradigm. Software engineering fundamentals learned by humans are still highly valuable when working with AI.

**The Smart Zone / Dumb Zone**
LLMs perform well up to roughly 100k tokens (~40% of context). Beyond that, quality degrades. Size tasks so the model stays in the smart zone — don't bite off more than it can chew. Break large tasks into small, focused ones.

**The Memento Problem**
LLMs start fresh with each new session, like the character in *Memento* — unable to form persistent memories. When you clear context (`/clear`) or compact (`/compact`), the model resets to its base state. Plan accordingly.

## Workflow Phases

A typical session follows these phases:

1. **Small context start** — orient the model with just what it needs
2. **Exploration** — understand the problem space
3. **Implementation** — build the feature
4. **Testing** — verify correctness

After context is cleared, the model returns to the system prompt. Know your token usage so you don't drift into the dumb zone mid-implementation. `/compact` compresses prior context; `/clear` wipes everything.

## Planning with PRDs and Issues

Instead of rigid multi-phase plans, treat delivery as a continuous loop: write a PRD, then make small incremental changes until you reach the finish line.

Steps after an initial grilling session:
1. **Document the destination** — user stories and definition of done
2. **Document the journey** — the plan to get there

The `/grill-me` skill bridges the alignment gap between human intent and AI understanding before implementation begins.

Once a PRD is solid, convert it into kanban issues on the tracker (`/to-issues`).

## Vertical Slices (not Horizontal Layers)

AI naturally wants to work horizontally — build the entire database layer, then the entire API layer, then the entire frontend. The problem: you get no feedback until all three layers are done.

Instead, cut **thin vertical slices**: a slice covers all layers (DB → API → frontend) for a single piece of functionality. This delivers early feedback and keeps the work reviewable.

## Sub-Agents

Claude can delegate tasks to sub-agents, which return results to the orchestrator. Two operating modes:
- **Human in the loop** — best for the planning phase
- **AFK (autonomous)** — appropriate for well-scoped implementation tasks

## Testing and Code Quality

**TDD is essential** for getting reliable outputs from AI agents. Good feedback loops are what keep AI output high quality.

**Deep modules over shallow modules** — modules with rich internal functionality and clean interfaces are the right test boundary. Design the interface, delegate the implementation. You only need to know the module's contract, not every line inside it. This preserves your mental model of the codebase while keeping it AI-delegable.

Garbage in, garbage out: if the codebase is messy, the agent will produce messy work.

The `/improve-codebase-architecture` skill helps identify opportunities to deepen modules.

## Code Review

Reviewing in the same session context risks entering the dumb zone and producing ineffective reviews. A fresh session is more reliable for review tasks.
