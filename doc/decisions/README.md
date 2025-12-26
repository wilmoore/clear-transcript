# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting significant technical decisions.

## What is an ADR?

An ADR captures the context, decision, and consequences of an architecturally significant choice.

## Format

We use the [Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## Naming Convention

- Filename: `NNN-kebab-case-title.md` (e.g., `001-use-localStorage-for-tracking.md`)
- NNN = zero-padded sequence number (001, 002, 003...)
- Title in heading must match: `# NNN. Title` (e.g., `# 001. Use localStorage for Tracking`)

## Index

<!-- New ADRs added below -->
- [001. Tiered Transcript Retrieval Pipeline](001-tiered-transcript-retrieval-pipeline.md)
- [002. Poll Cancellation for Race Condition Prevention](002-poll-cancellation-for-race-condition-prevention.md)
- [003. Vitest with Happy-DOM for Unit Testing](003-vitest-with-happy-dom-for-unit-testing.md)
