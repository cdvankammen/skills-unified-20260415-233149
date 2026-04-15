---
name: zion-skill
description: 'Integration helper for the Zion monorepo. Use when asked to explore the zion workspace, run Storybook, scaffold new components, run tests, locate package docs/examples, or generate code that re-uses Zion components.'
compatibility: 'Node.js v24; workspace path: /Users/stillbulldog35/Documents/workgithub/zion'
---

# Zion Integration Skill

This skill packages workflows and best-practices for working with the Zion monorepo of shared UI components so an agent can operate on the codebase reliably.

## When to use this skill
- User asks the agent to inspect or modify the Zion repo (packages/*)
- Run or troubleshoot Storybook, unit tests, or component scaffolding
- Scaffold a new UI component or Storybook story that re-uses Zion components
- Find docs, examples, or package locations in the monorepo
- Generate example code/snippets using Zion components

## Prerequisites (what the agent expects)
- The Zion repository is present at the workspace path in `compatibility` above.
- Node.js v24 installed locally (matching the repo README).
- The repository has been prepared (run `npm install` at the repo root).
- `fr env` may be required to generate `.env` as documented in the repo README.

## Quick commands (run from the zion repo root)
- Install deps:

```
cd /Users/stillbulldog35/Documents/workgithub/zion
npm install
```

- Prepare environment variables (if needed):

```
fr env
```

- Start Storybook / dev server:

```
npm start
```

- Run all Jest tests:

```
npm test
```

- Run test subset (match a file path or pattern):

```
npm test someString
```

- Scaffold a new component (boilerplate):

```
npm run new:component
```

- Clean and reinstall (if lockfiles cause issues):

```
rm *lock* && npm run clean
npm install
```

## Common workflows (step-by-step)

1) Start Storybook and verify docs
- cd to repo root
- ensure dependencies installed and `.env` created
- run `npm start`
- open the Storybook URL printed in the terminal or visit the deployed docs at: https://beta.familysearch.org/frontier/zion/

2) Add a new component + Storybook story
- Run `npm run new:component` and follow prompts to create the package skeleton
- If translations required: `npm run locales:add <component-name>`
- Add the component implementation under `packages/<your-package>/src`
- Add Storybook MDX or story under the package `stories/` or `src/__stories__` following existing patterns
- Add the owning team to `CODEOWNERS`
- Create PR into `master` following the repo's release process

3) Run tests for a package
- From repo root, to run all tests: `npm test`
- To focus on a package or file pattern: `npm test <pattern>`
- For cypress/component tests: `npx cypress open` then choose component tests (Storybook should be running for some setups)

4) Locate a package or docs page
- Packages live under `packages/`.
- Storybook docs URL paths can be constructed by examining story paths (see `StorybookLink` examples in the repo README).
- Public docs: https://beta.familysearch.org/frontier/zion/?path=/docs/introduction-about-zion--docs

5) Generate a code example that re-uses a Zion component
- Identify the component package (e.g., `packages/person` or `packages/image-viewer`)
- Create a new component or example app that imports from the package path: `import { PersonCard } from '@fs/zion-<package>'` (adjust import path to repo packaging)
- Add Storybook story and unit test for the example

## Agent quality checklist (use before proposing changes)
- [ ] Repo builds locally (no missing deps)
- [ ] Storybook runs and the new story appears
- [ ] Unit tests pass (local `npm test` success)
- [ ] Translations added if component surfaced to users
- [ ] `CODEOWNERS` updated with owning team for new packages
- [ ] PR includes changelog notes and follows the repo's merge checklist

## Troubleshooting notes
- Node version mismatch: ensure Node v24 (use nvm or node version manager)
- Environment variables: if Storybook or tests require env values, run `fr env` or check `.env` files
- Test flakiness: run the specific test with verbose logging and review snapshots or web-driver artifacts
- Storybook port conflicts: stop previous processes or change the port in config

## Example prompts for users (good to paste when invoking this skill)
- "Open the Zion repo and add a Storybook story for `packages/person` that demonstrates the compact PersonCard with test data."
- "Create a new component called `my-avatar` using the Zion new:component script, add a Storybook story, and a basic Jest test."
- "Run the Jest tests for the `image-viewer` package and summarize failures." 
- "Find where `attach-image-to-tree` is used across the monorepo and list files that import it." 
- "Create a small example React component that composes `PersonCard` and `PortraitSelector` and add a Storybook story." 

## Related customizations (next steps you may ask the agent to create)
- Add an automation script under `.agents/skills/zion-skill/scripts/` to run `npm install`, `fr env`, start Storybook and run a smoke test.
- Create a code generator that scaffolds story + test when the user describes the component props.
- Add a validation script to run CI-style checks locally (lint, jest subset, storybook build).

## References
- Live docs: https://beta.familysearch.org/frontier/zion/?path=/docs/introduction-about-zion--docs
- Local repo README: `README.md` at `/Users/stillbulldog35/Documents/workgithub/zion/README.md`
- Packages path: `packages/` under repo root

---

*This skill is intended to be workspace-scoped (uses the local Zion repo). Update the `compatibility` field if the zion path differs.*
