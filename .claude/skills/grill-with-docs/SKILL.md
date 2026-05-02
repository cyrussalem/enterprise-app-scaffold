---
name: grill-with-docs
description: Grilling session challenging plans against domain models, sharpening terminology, and updating documentation inline. Use when the user wants to stress-test a design against the existing domain model, or when terminology needs to be locked down in CONTEXT.md.
---

Interview the user thoroughly about every plan aspect until reaching shared understanding. Walk through each design branch, resolving dependencies sequentially. Pose questions individually, waiting for responses before proceeding.

When applicable, explore the codebase rather than asking questions.

## Domain Awareness

Most repositories follow this structure:

- Root-level `CONTEXT.md`
- `docs/adr/` directory for architectural decisions
- `src/` directory for code

Multi-context repos contain `CONTEXT-MAP.md` at root, with context-specific `CONTEXT.md` and `docs/adr/` folders within each domain.

Create documentation files only when needed — establish `CONTEXT.md` upon first term resolution and `docs/adr/` when first ADR becomes necessary.

## During Session Responsibilities

**Challenge against glossary:** Flag terminology conflicts between user statements and existing `CONTEXT.md` definitions immediately. Don't let ambiguous terms slide.

**Sharpen fuzzy language:** Propose precise canonical terms when users employ vague terminology. Get agreement before writing anything down.

**Discuss concrete scenarios:** Stress-test domain relationships using specific edge-case examples.

**Cross-reference with code:** Surface contradictions between stated behaviour and actual implementation.

**Update `CONTEXT.md` inline:** Capture resolved terms immediately as decisions crystallise. Don't batch updates — write them as soon as agreement is reached.

**Offer ADRs sparingly:** Create architectural decision records only when all three conditions are true:
1. The decision is hard to reverse
2. It would be surprising without context
3. It results from genuine trade-offs considered and rejected

Don't create ADRs for ephemeral reasons ("not worth it right now") or self-evident ones.
