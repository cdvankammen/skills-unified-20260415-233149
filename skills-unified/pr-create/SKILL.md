---
name: pr-create
description: Create a GitHub Pull Request by analyzing unpushed commits and filling out the repo's PULL_REQUEST_TEMPLATE.md using GitHub CLI. Use when the user wants to create a PR, open a pull request, or says something like "make a PR", "open a PR", "submit a PR", or "create a pull request".
---

# GitHub PR Creator

Create a pull request by analyzing commits and intelligently filling out the repository's PR template using `gh` CLI.

## Prerequisites

- `gh` (GitHub CLI) must be installed and authenticated
- The current directory must be a git repository
- A `PULL_REQUEST_TEMPLATE.md` must exist in the root of the repo

## Workflow

### Step 1: Gather Context

1. **Identify the current branch:**
   ```bash
   git branch --show-current
   ```
   If on `main` or `master`, stop and tell the user they need to be on a feature branch.

   **Extract Jira ID from branch name** if possible:
   - Look for common patterns like `RIP-1234`, `PROJ-456`, etc. in the branch name
   - Common formats: `feature/JIRA-123`, `JIRA-123-description`, `user/JIRA-123-feature`
   - Store the detected Jira ID to use as an option in Step 2

2. **Determine the base branch:**
   Default to `main`. If `main` doesn't exist, try `master`. If neither exists, ask the user.

3. **Get the unpushed commits** (commits on this branch not yet in the base branch):
   ```bash
   git log origin/<base>..HEAD --pretty=format:"%h %s" --reverse
   ```
   If there are no commits, tell the user there's nothing to open a PR for.

4. **Get the full diffs for context** (used to understand what changed):
   ```bash
   git diff origin/<base>..HEAD --stat
   git diff origin/<base>..HEAD
   ```
   For very large diffs (>500 lines), use `--stat` summary plus selective file diffs for the most important files rather than the full diff.

5. **Read the PR template:**
   ```bash
   cat PULL_REQUEST_TEMPLATE.md
   ```
   If the template doesn't exist in the repo root, inform the user and offer to create a basic PR body without a template.

### Step 1.5: Check Branch Sync Status

Before analyzing commits, verify the local branch is up-to-date with the remote base branch to prevent including commits from other merged PRs.

1. **Check if local branch is behind remote base:**
   ```bash
   git fetch origin <base>
   git rev-list --count HEAD..origin/<base>
   ```

2. **If the count is > 0**, the branch is behind:
   - Inform the user: "Your branch is X commits behind origin/<base>. This may cause the PR to include commits from other merged PRs."
   - Ask: "Would you like to sync your branch with origin/<base> first?"

3. **If user agrees to sync:**
   - Check for uncommitted changes first: `git status --porcelain`
   - If uncommitted changes exist, warn the user and suggest stashing or committing first
   - If clean or user wants to proceed: `git pull --rebase origin <base>`
   - If conflicts occur, inform the user they need to resolve conflicts manually before continuing
   - Stop the pr-create process - user should restart after resolving conflicts

4. **If user declines to sync:**
   - Warn that the PR analysis may include unrelated commits
   - Continue to Step 2

### Step 2: Collect Information from the User

Use the `AskUserQuestion` tool to collect information interactively. The questions should follow the order of sections in the PR template to maintain consistency with template structure.

Parse the PR template to identify:
1. **PR Type options** (e.g., Bug fix, New Feature, Refactor) from the "PR Type" section
2. **Environment options** (e.g., Int, Prod) from the "Test Plan" section
3. **Author checklist items** to summarize in the confirmation question

Detect the Jira ticket ID from the branch name if possible (e.g., `feature/RIP-1234-description` → `RIP-1234`).

Ask questions in this order using `AskUserQuestion`:

**Question 1: PR Type**
- Parse the PR Type section from the template
- Offer each type as an option (e.g., "Bug fix", "New Feature", "Refactor")
- Single select

**Question 2: Jira ID(s)**
- If a Jira ID is detected from the branch name, offer it as the first option with description "Detected from branch name"
- Always include an "Other" option where the user can type their own Jira ID(s)
- Single select

**Question 3: Author Checklist**
- Binary choice: "Yes, all completed" vs "No, some incomplete"
- If "Yes", proceed to Step 3
- If "No", perform automated checks (see Step 2.5 below)
- Single select

### Step 2.5: Automated Checklist Validation (If "No" to Author Checklist)

If the user answered "No" to Question 3 (Author Checklist not all completed), automatically run these checks and tasks:

#### Run Automated Tasks
Execute these commands sequentially and collect any issues found:

1. **Sync locales:**
   ```bash
   npm run locales:sync
   ```
   If this generates changes:
   - Stage the locale files: `git add src/locales/`
   - Commit: `git commit -m "chore: sync locale files"`
   - Push: `git push --no-verify`
   - Inform the user that locale files were synced, committed, and pushed
   - Continue to next check

2. **Run linting with auto-fix:**
   ```bash
   npm run lint:fix
   ```
   - If this produces changes:
     - Stage all changed files: `git add -A`
     - Commit: `git commit -m "chore: fix linting issues"`
     - Push: `git push --no-verify`
     - Inform the user that linting issues were auto-fixed, committed, and pushed
   - After auto-fix, run `npm run lint` to check for remaining errors
   - If linting still fails, collect the lint errors to include in the issue plan (do not stop immediately)
   - If linting passes, continue to next check

3. **Run tests:**
   ```bash
   npm test:ai
   ```
   - If tests pass, continue to next check
   - If tests fail, collect the test failures to include in the issue plan (do not stop immediately)

#### Review Changed Files for Code Quality

Get the list of changed files:
```bash
git diff origin/<base>..HEAD --name-only
```

For each `.js` or `.jsx` file in the changed files, perform these checks:

1. **Check for `linkName` props:**
   - Search for `<BillboardButton`, `<Button`, `<IconButton`, and `<DangerButton` components
   - Verify each has a `linkName` prop
   - Report any instances missing `linkName` to the user

2. **Check for `data-testid` attributes:**
   - Search for `<Button` and `<Input` components
   - Verify each has a `data-testid` attribute
   - Report any instances missing `data-testid` to the user

3. **Check for null checks:**
   - Look for property access patterns that could fail with null/undefined:
     - Chained property access (e.g., `obj.prop.subprop`)
     - Array access (e.g., `array[0].prop`)
     - Function calls on potentially undefined values
   - Check if proper null checks exist:
     - Optional chaining (`?.`)
     - Null checks (`if (obj && obj.prop)`)
     - Default values (`obj?.prop || defaultValue`)
   - Report suspicious patterns without null checks to the user

**After automated checks complete:**

**If issues are found** (lint errors, test failures, missing linkName, missing data-testid, missing null checks):
1. **Summarize all findings** to the user with specific details:
   - Lint errors: show the file, line number, and error message
   - Test failures: show the test name, file, and failure reason
   - Missing `linkName` props: show file, line number, and component type
   - Missing `data-testid` attributes: show file, line number, and element type
   - Missing null checks: show file, line number, and risky code pattern
2. **Create a detailed plan** to address each issue:
   - For lint errors: specify the files and errors that need manual fixes
   - For test failures: specify which tests are failing and suggest potential fixes
   - For missing `linkName` props: specify which components need the prop added and suggest appropriate names
   - For missing `data-testid` attributes: specify which elements need the attribute and suggest appropriate IDs
   - For missing null checks: specify the risky code patterns and suggest appropriate fixes (optional chaining, null checks, etc.)
3. **Present the plan to the user** and ask for approval
4. **If approved:** Implement the plan within the same skill execution
   - Fix all issues according to the approved plan
   - Run tests to verify fixes: `npm run test:ai`
   - Commit the changes: `git add -A && git commit -m "chore: fix automated checklist issues"`
   - Push with `--no-verify`: `git push --no-verify`
   - Inform the user: "All issues have been fixed, tested, committed, and pushed. Continuing with PR creation."
   - Continue to Step 3
5. **If not approved:** Stop the PR creation process and inform the user they need to manually fix the issues before creating a PR

**If no issues are found:**
- Inform the user that all automated checks passed
- Continue to Step 3

### Step 3: Handle Uncommitted Changes and Push

At this point, the author checklist has been addressed (either confirmed complete or automated tasks have been run). Now handle any remaining uncommitted changes and ensure the branch is pushed.

1. **Check for uncommitted changes:**
   ```bash
   git status --porcelain
   ```

2. **If there are uncommitted changes:**
   - Inform the user: "You have uncommitted changes."
   - Auto-generate a commit message based on the changed files
   - Commit message format: `chore: commit changes for PR` or similar generic message
   - Stage all changes: `git add -A`
   - Commit: `git commit -m "<generated-message>"`

3. **Check if branch needs to be pushed:**
   ```bash
   git status -sb
   ```

4. **Check if PR already exists:**
   ```bash
   gh pr list --head <branch-name>
   ```
   - If a PR already exists, inform the user and provide the existing PR URL
   - Stop the process - don't create a duplicate PR

5. **If there are unpushed commits:**
   - Inform the user: "You have X unpushed commit(s) on `branch-name`."
   - Ask: "Want me to push them before continuing with PR creation?"
   - If yes: `git push -u origin <branch>` (use `-u` if first push)
   - If no: Inform the user the PR cannot be created without pushing and stop

6. **Continue to Step 4** (collect Environment and Starting URL)

### Step 4: Collect Remaining PR Details

Now that the code is committed and pushed, collect the final details for the PR.

Use `AskUserQuestion` to ask:

**Question: Environment**
- Parse the Environment section from the Test Plan in the template
- Offer each environment as an option (e.g., "Int", "Prod")
- Support multi-select to allow checking multiple environments

After the `AskUserQuestion` tool completes, prompt the user for:

**Starting URL** (plain text prompt, not AskUserQuestion):
- Ask: "What URL should reviewers use to start testing these changes?"
- Insert this URL into the "Starting URL:" field in the Test Plan section

### Step 5: Fill Out the Template

Analyze the commits and diffs to intelligently fill out each section of the PR template. Follow these principles:

- **Read the template carefully.** Every template is different. Parse the headings, checkboxes, and placeholder text to understand what each section expects.
- **Be specific, not generic.** Reference actual file names, function names, and changes from the diff. Don't write vague filler like "Various improvements were made."
- **Match the template's tone and style.** If the template uses checkboxes, fill them in. If it has HTML comments as instructions, follow them and remove the comments.
- **Commit messages are your primary source.** Use them to understand the narrative arc of the changes — what was done and why.
- **Diffs are your detail source.** Use them to fill in technical details, list affected files, and describe the scope of changes.
- **Leave sections empty or mark N/A** if they genuinely don't apply (e.g., "Breaking Changes" when there are none). Don't fabricate content.
- **Preserve template structure.** Keep all headings and formatting from the original template intact.
- **PR Type:** Check the box for the PR type the user selected (Bug fix, New Feature, or Refactor).
- **Jira ID(s):** Insert the Jira ticket(s) the user provided wherever the template expects them. Create a link format like `[RIP-1234](https://familysearch.atlassian.net/browse/RIP-1234)` if the template uses links.
- **Author checklist:** If the user selected "Yes, all completed", check all boxes. If "No, some incomplete", leave all boxes unchecked.
- **Environment:** In the Test Plan section, check the environment box(es) the user selected (e.g., [x] Int, [ ] Prod).
- **Starting URL:** Insert the URL the user provided in the "Starting URL:" field in the Test Plan section.

#### Generating the Description Section

If the template has a "Description" section (usually near the top), generate a concise summary (2-4 sentences) that explains:

1. **What problem this PR solves** - What issue, bug, or need is being addressed?
2. **What changes were made** - High-level summary of the solution (not implementation details)
3. **Why this approach** - If relevant, briefly explain the reasoning behind the approach

**Description principles:**
- Write from the user/business perspective, not the code perspective
- Focus on the "what" and "why" rather than the "how"
- Be concise but informative - reviewers should understand the PR's purpose without reading all the code
- Avoid generic phrases like "This PR makes some updates" - be specific about what's changing
- If multiple features/fixes are included, list them as bullet points

For description examples, see [examples/examples.md](examples/examples.md#description-examples).

### Step 6: Generate the Test Plan

Using the commits and diffs, generate a detailed test plan. Create one test block **per logical change** (not per commit — group related commits together).

Each test block must follow a specific format. See [examples/examples.md](examples/examples.md#test-block-format-example) for the exact format.

**Test plan principles:**

- **Be concrete.** Reference specific UI elements, pages, components, and behaviors — not abstract descriptions.
- **Start from the user's perspective.** Steps should describe what a human reviewer does in a browser, not what the code does internally.
- **Include edge cases.** If a change handles empty states, error states, boundary conditions, or feature flags, add steps to verify those.
- **Use the Starting URL.** The first step of the first test block (and any other blocks where it's relevant) should reference the Starting URL provided by the user.
- **Group by feature, not by file.** If three commits all touch the same feature, combine them into one test block. If one commit changes two unrelated things, split into two blocks.
- **Cover negative cases.** If something was removed or restricted, include a step verifying the old behavior no longer occurs.

### Step 7: Generate the PR Title

The PR title **must** follow this format:

```
{Jira ID}: {git commit type} - {brief description of the change}
```

Rules:
- **Jira ID:** Use the primary Jira ticket. If multiple Jiras, use the most relevant one (or comma-separate if equally important: `PROJ-123, PROJ-456`).
- **Git commit type:** Infer the conventional commit type from the commits (`feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `test`, `perf`, `ci`, `build`). If commits use mixed types, pick the dominant one or the most significant.
- **Brief description:** A concise summary of the overall change, not a repeat of a single commit message. Keep the full title under 72 characters where possible.

For title examples, see [examples/examples.md](examples/examples.md#pr-title-examples).

### Step 8: Present the Draft for Review

Before creating the PR, show the user:
1. **Title** — the proposed PR title
2. **Base branch** — where the PR will merge into
3. **Body** — the filled-out template (including test plan, checklist, Jira links, starting URL)

Ask the user to confirm or request changes. Iterate if they want edits.

### Step 9: Create the PR

Once confirmed, create the PR using `gh pr create` with stdin for the body:

```bash
gh pr create --base <base-branch> --title "<title>" --body-file - << 'PRBODY'
<filled template content>
PRBODY
```

**Important notes:**
- `--base <branch>`: Specifies the target branch for the PR (e.g., `master`, `main`)
- `--title "<title>"`: The PR title (must be quoted if it contains spaces)
- `--body-file -`: Reads the PR body from standard input (stdin), eliminating the need for temporary files
- **Quoted delimiter (`'PRBODY'`)**: Critical - prevents shell expansion of variables and special characters in the template content
- After creation, `gh` outputs the PR URL - share this with the user

**Additional useful flags (not used in basic workflow):**
- `--draft` or `-d`: Create as a draft PR
- `--assignee <users>` or `-a <users>`: Assign users to the PR
- `--reviewer <users>` or `-r <users>`: Request reviews from specific users
- `--label <labels>` or `-l <labels>`: Add labels to the PR
- `--web` or `-w`: Open the PR in a web browser after creation

**Alternative approaches not recommended for this workflow:**
- `--fill`: Auto-fills title and body from commits, but doesn't allow for custom descriptions or test plans
- `--body "<string>"`: Requires escaping special characters and is harder to read for long content
- Interactive mode (no flags): Requires manual input and doesn't allow automation
- Editor mode (`--editor` or `-e`): Opens an editor, but our approach is more scriptable

## Error Handling

| Error | Action |
|-------|--------|
| `gh` not installed | Tell user to install: `brew install gh` or see https://cli.github.com |
| `gh` not authenticated | Tell user to run `gh auth login` |
| No remote set | Tell user to add a remote: `git remote add origin <url>` |
| Branch not pushed | Cannot create PR without pushing - branch must exist on remote |
| Branch already has open PR | Inform user and provide the existing PR URL (use `gh pr list --head <branch>` to check) |
| Template not found | Offer to create PR with a simple body summarizing the commits |
| Push rejected | Show the error and suggest `git pull --rebase` first |
| Base branch doesn't exist | Verify base branch name or use `--base <branch>` with correct branch |

## Example Interaction Flow

For a complete workflow example showing how all the steps work together, see [examples/examples.md](examples/examples.md#complete-workflow-example).
