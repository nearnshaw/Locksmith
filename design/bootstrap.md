# Bootstrap record — Locksmith

- Date: 2026-10-23
- Project: this folder (Creator Hub scene "Locksmith"), 1 parcel, SDK `@dcl/sdk` 7.31.0, `@dcl/ecs` 7.31.0
- Skills: `.claude/skills` → symlink to the Creator Hub's managed `sdk-skills` copy; `dcl-gdd` and `dcl-prototype` at `~/.claude/skills` (same as `resources/game-design-skills.zip` in decentraland/docs; the only difference is `dcl-prototype/references/greybox-build.md`, newer locally)
- Route: Claude Code in VS Code, Bash-first. Creator Hub app running with this scene open (data layer on port 62829, tsc watch running). Creator Hub MCP: not exposed. Explorer MCP: configured, connection refused (Explorer not running). Blender MCP: listed, not needed.
- Checks: `npx tsc -p tsconfig.json --noEmit` (type-check); the Creator Hub's own dev server rebuilds `bin/index.js` on save, verified by grepping a string literal.
- Pending: in-world smoke in the Explorer; mobile check.
