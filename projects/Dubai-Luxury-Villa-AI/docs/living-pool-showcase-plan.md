# Living room → pool showcase — issue #21

[Tracking task](https://github.com/safal207/Architectural-AI-Lab/issues/21)

## Client result

A short, visitor-controlled study of the living room and pool terrace. Compare
Warm Limestone and Graphite Mineral on the existing villa, then carry the chosen
direction into the local project brief. The full three-palette studio remains
available, including Sandstone Warmth.

The two buttons select existing authored presentation views. They do not describe
a new continuous walking route through glazing or prove collision-free movement.

## Implementation order

1. Read the current source and existing geometry/material evidence. Start from
   `main` commit `434bc687c4eaa4f5c9d97bb102f4b6c4651d2896`.
2. Add the two-view client controls using the existing `living` and `pool` stops.
3. Give both palette selectors, the viewer and the brief one shared state.
4. Check real browser rendering, downloaded briefs, focus, narrow layout and the
   WebGL fallback against the production build; inspect fresh static captures.
5. Open a linked PR and record its actual verification. Review and publication
   remain a separate decision.

## Genex fit

The existing Blender → GLB → React/Three.js pipeline matches the formats described
by [Genex Desktop](https://genex.games/desktop). Its
[official skill](https://github.com/genex-games/genex/blob/main/skills/genex/SKILL.md)
advises using an existing dedicated asset pipeline and filling gaps with Genex.

This first slice already has its required model and palettes. It therefore does
not require a new account, installation, paid generation or runtime Genex
dependency. No Genex build/generation is claimed by this implementation.

The [CLI reference](https://genex.games/docs/reference/cli) describes a live
Blender bridge, but does not establish headless/background support for this
workspace. Evaluate that boundary separately before selecting the bridge.

## Next steps, in order

1. Review this compact experience and its static captures.
2. Verify interaction and responsiveness on a physical phone and desktop GPU.
3. Make a release decision for this change independently of the held PRs.
4. Choose one missing interior detail. Compare the authored Blender pipeline
   against Genex only for that bounded asset task, with provenance and a budget.
5. Return to full-tour polish and native-motion acceptance before growing the
   property context or adding game mechanics.

PR #16 and PR #19 retain their own draft/HOLD and native-motion boundaries. This
plan does not merge them, certify their performance or repeat their previous
camera/lighting experiments. The older architecture roadmap remains useful
design history; its PR #1 and active-branch references are historical, not current
branch instructions.
