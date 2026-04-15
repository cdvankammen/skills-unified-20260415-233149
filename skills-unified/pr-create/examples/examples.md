# PR Create Skill Examples

This file contains examples referenced by the `pr-create` skill.

## PR Title Examples

**Format:** `{Jira ID}: {git commit type} - {brief description of the change}`

**Good examples:**
- `PROJ-1234: feat - Add More/Less toggle to Additional Facts card`
- `PROJ-567: fix - Resolve login redirect loop on expired sessions`
- `PROJ-890, PROJ-891: refactor - Extract shared validation logic into hooks`

## Description Examples

### Good Description Example

> This PR fixes several bugs in the V2 attach flow that were causing issues with nested panels and UI component consistency. Specifically, it migrates the Manage Names panel to use `InfoSheetPanel` to resolve nesting conflicts, replaces the custom More button in Additional Facts with the standard `MoreLess` component for consistency, and adds feature flag gating to hide the Transcript button when the V2 flow is enabled. These changes ensure the V2 user interface works smoothly without conflicting component behavior.

### Bad Description Example (too vague)

> This PR updates several components and fixes some bugs.

## Test Block Format Example

```
***{Section/Feature Name} - {Brief Change Description}***
What changed: {One sentence describing the code change}
Steps to test:
1. {Navigate to a specific page or starting point — use the Starting URL where applicable}
2. {Perform a specific action}
3. {Verify an expected outcome}
4. {Continue with additional steps as needed}
5. {Include edge cases where relevant}
```

## Complete Workflow Example

```
User: "Create a PR"

Claude:
1. Checks branch → feature/RIP-1234-add-more-less-toggle
2. Finds 3 unpushed commits
3. Checks if branch is behind origin/master → Branch is up-to-date
4. Reads PULL_REQUEST_TEMPLATE.md
5. Parses template to extract PR Type options, Environment options, and checklist items
6. Reads commits + diffs
7. Uses AskUserQuestion to ask:
   - PR Type? → "New Feature"
   - Jira ID(s)? Shows "RIP-1234 (detected from branch)" as option → User selects it
   - Author checklist completed? → "Yes, all completed"
8. Checks for uncommitted changes → None found
9. Checks if branch is pushed → Not pushed
10. Asks: "You have 3 unpushed commits on `feature/RIP-1234-add-more-less-toggle`. Want me to push them before continuing with PR creation?" → Yes → pushes
11. Uses AskUserQuestion to ask:
    - Environment? → "Int" (multiSelect, user can pick both Int and Prod)
12. Asks via plain text: "What URL should reviewers use to start testing these changes?"
    → User provides: "https://integration.familysearch.org/records/images/ark:/61903/12345?view=fullText"
13. Generates description summarizing the changes
14. Fills template with:
    - PR Type: [x] New Feature
    - Jira link: [RIP-1234](https://familysearch.atlassian.net/browse/RIP-1234)
    - All author checklist items: [x]
    - Starting URL: https://integration.familysearch.org/records/images/ark:/61903/12345?view=fullText
    - Environment: [x] Int
15. Generates test plan:

    ***Additional Facts - More/Less Functionality***
    What changed: Replaced custom "More" button with MoreLess component
    Steps to test:
    1. Navigate to https://integration.familysearch.org/records/images/ark:/61903/12345?view=fullText
    2. Open the Additional Facts card in the side panel
    3. Verify facts are initially collapsed (showing ~10 facts)
    4. Click "More" to expand all facts
    5. Click "Less" to collapse back to initial view
    6. Test with a record that has 10 or fewer facts - verify no More/Less buttons appear

16. Generates title: "RIP-1234: feat - Add More/Less toggle to Additional Facts card"
17. Shows full draft for review
18. User confirms → runs:
    ```bash
    gh pr create --base master --title "RIP-1234: feat - Add More/Less toggle to Additional Facts card" --body-file - << 'PRBODY'
    [filled PR template content]
    PRBODY
    ```
19. Shares PR URL with user
```
