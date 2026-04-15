---
name: gitcha
description: Run test checks and automatically fix test issues. Use when running tests, analyzing test failures/warnings, or fixing broken tests. Processes tests_simplified.txt output and applies fixes assuming production code is correct. NEVER skips or disables tests. May delete outdated tests only after explicit user approval via AskUserQuestion.
allowed-tools: Bash, Read, Grep, Edit, AskUserQuestion
---

# Gitcha - Test Check and Fix Skill

## Purpose

This Skill runs the globally installed `gitcha` command which:
1. Detects open PR for current branch
2. Identifies changed files
3. Runs tests for changed files
4. Outputs simplified test results to `tests_simplified.txt`

Then analyzes failures/warnings and automatically applies fixes.

## CRITICAL RULE: NEVER SKIP TESTS

**UNDER NO CIRCUMSTANCES should tests be skipped, disabled, or marked as .skip().**

This includes:
- NEVER use `it.skip()`, `test.skip()`, `describe.skip()`, or `xit()`
- NEVER comment out tests
- NEVER remove tests to make them "pass"
- NEVER use `--passWithNoTests` flag (already removed from script)
- NEVER accept "No tests found" as a valid outcome when changed files exist

If tests are failing:
1. Fix the test setup/mocks/assertions
2. If a test is genuinely outdated/invalid (see below), verify with user before removing
3. All test failures must be resolved by fixing the tests, not by skipping them

### Exception: Deleting Outdated Tests (With User Approval)

**You MAY delete tests, but ONLY after explicit user verification via AskUserQuestion.**

A test is considered outdated when:
- It tests code that no longer exists in the production codebase
- It tests a feature/behavior that has been intentionally removed
- It tests an API or interface that has been replaced/deprecated
- The test file exists but the corresponding component/module was deleted

**Process for deleting outdated tests:**

1. **Identify** the outdated test by checking if:
   - The production code being tested still exists
   - The behavior being tested is still relevant
   - The test is failing because the feature was intentionally removed

2. **Verify with user** using AskUserQuestion:
   ```
   Question: "Should I delete this outdated test?"
   Context: Explain what the test tests and why it appears outdated
   Options:
   - "Yes, delete it"
   - "No, fix it instead"
   ```

3. **Only delete** after receiving explicit user approval

4. **Never delete** a failing test without user approval - fix it first

**Example scenarios:**

- ✅ **DELETE (after user approval)**: Test for `OldLoginComponent.js` when component was replaced with `NewAuthComponent.js`
- ✅ **DELETE (after user approval)**: Test for removed feature like deprecated API endpoint
- ❌ **NEVER DELETE**: Failing test where the production code still exists - fix the test instead
- ❌ **NEVER DELETE**: Test that's "hard to fix" - that's not a reason to delete

## Core Principle

**ALWAYS assume production code is correct. Only fix test files.**

When tests fail, the issue is almost always in the test setup, mocks, or assertions - NOT in the production code being tested.

**Exception:** React key warnings may indicate real production bugs (component re-mounting, lost state). Use judgment - if the warning points to a genuine issue, it may warrant investigation or discussion rather than immediate mocking.

## How It Works

### Step 1: Run Gitcha Command

Run the gitcha command and wait for completion:

```bash
node .claude/skills/gitcha/gitcha.js
```

The command will:
- Analyze git diff against PR base branch
- Filter to changed .js/.jsx/.ts/.tsx files in src/
- Run tests with `npm run test -- --testPathPattern='...' --watchAll=false`
- Save raw output to tests_raw.txt
- Generate simplified output in tests_simplified.txt

### Step 2: Analyze Output

Read the simplified test output:

```bash
cat tests_simplified.txt
```

**IMPORTANT: Validate Tests Ran**

Before analyzing failures, verify that tests actually executed:
- Check for test suite names (e.g., "PASS src/components/Foo.test.js")
- If output shows "No tests found", this is an ERROR condition
- If the file is empty or only contains setup logs, tests did NOT run
- NEVER accept "No tests found" as success - investigate why tests weren't found

If tests didn't run:
1. Verify test files exist for the changed components
2. Check that test file naming matches the pattern (ComponentName.test.js)
3. If no test files exist, CREATE them - don't skip testing

Look for these common patterns:

**Test Failures:**
- `FAIL` markers indicating failed test suites
- `● Test Name` markers showing specific failed tests
- Error messages like "Expected X but received Y"
- Timeout errors
- Component render failures
- Cannot access properties of undefined (check for potential mocking issues)

**Warnings:**
- Console warnings during tests
- Missing prop type warnings
- React warnings (e.g., "Can't perform a React state update on an unmounted component")
- Missing mock implementations
- Unhandled promise rejections

**Stack Traces:**
- Appear as `(...Stack Trace)` followed by file path like `(src/path/to/file.js:123:45)`
- The file path indicates where the error originated

### Step 3: Fix Issues

Apply fixes based on error patterns. Follow these guidelines:

**Important: Check if Production Code Exists First**

Before attempting to fix a failing test, verify the production code being tested still exists:

```bash
# Search for the component/module being tested
find src -name "ComponentName.js"
# or
grep -r "ComponentName" src/
```

If production code doesn't exist:
- This may be an outdated test (proceed to Step 4)
- The component may have been moved/renamed (search broader)
- NEVER fix a test for code that doesn't exist

#### A. Component Mocking

**When to mock:**
- When network calls are being made (always mock network requests)
- When tests import components that aren't the subject of the test
- When child components have complex dependencies
- When render errors occur from deeply nested components

**How to mock:**

```javascript
// At top of test file, before imports
jest.mock('../ComponentToMock', () => ({
  ComponentToMock: jest.fn(() => <div data-testid="mocked-component">Mocked</div>)
}));

// For default exports
jest.mock('../ComponentToMock', () => jest.fn(() => <div>Mocked</div>));

// For multiple named exports
jest.mock('../ComponentToMock', () => ({
  ComponentA: jest.fn(() => <div>Mock A</div>),
  ComponentB: jest.fn(() => <div>Mock B</div>)
}));
```

**Using requireActual for partial mocks:**

When wholesale mocking causes "X is not a function" errors:

```javascript
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'), // Keep all real implementations
  specificFunction: jest.fn() // Only mock what you need
}));

// For components with hooks or utilities you want to keep
jest.mock('../ComponentWithHooks', () => {
  const actual = jest.requireActual('../ComponentWithHooks');
  return {
    ...actual,
    ComponentWithHooks: jest.fn(() => <div>Mocked</div>),
    // useCustomHook remains real from actual
  };
});
```

#### B. Missing Functions/Imports

**Pattern:** "X is not a function" or "Cannot read property 'Y' of undefined"

**Fix:** Check if a mock removed needed exports

```javascript
// Before (breaks things)
jest.mock('../utils');

// After (keeps everything except what you override)
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils'),
  functionToMock: jest.fn()
}));
```

#### C. React Warnings

**Pattern:** "Warning: Can't perform a React state update on an unmounted component"

**Fix:** Add cleanup in test or mock the component causing async updates

```javascript
// Add cleanup
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Or mock the problematic component
jest.mock('../AsyncComponent', () => jest.fn(() => <div>Mocked</div>));
```

**Pattern:** "Warning: Invalid prop X supplied to ComponentY"

**Fix:** Mock the component receiving invalid props

```javascript
jest.mock('../ComponentY', () => jest.fn(() => <div>Mocked</div>));
```

**Pattern:** "Warning: Each child in a list should have a unique "key" prop"

**Fix:** Add keys to the list items. Don't hide the warning by mocking - fix the actual issue.

```javascript
// Fix Option 1: If test code is rendering a list, add keys in the test
const items = ['a', 'b', 'c'];
items.map((item) => <Component key={item} value={item} />);

// Fix Option 2: If production code is missing keys, that's a production bug!
// React key warnings often indicate real issues with component re-mounting and state.
// DON'T mock it away - investigate and fix the production code if needed.
// (This conflicts with "assume production code is correct" - use judgment!)

// Fix Option 3: ONLY if a third-party component you don't control has irrelevant warnings
jest.mock('@fs/zion-ui', () => ({
  ...jest.requireActual('@fs/zion-ui'),
  ThirdPartyListComponent: jest.fn(({ children }) => <div>{children}</div>)
}));
```

#### D. Timeout Errors

**Pattern:** "Exceeded timeout of 5000ms for a test"

**Fix:** No test should take more than 5 seconds. Timeouts indicate underlying issues:

**Common causes:**
- Infinite React update loops (check for state updates triggering re-renders)
- `waitFor` calls that never resolve (check expectations match actual behavior)
- Invalid test expectations (component never reaches expected state)
- Test is testing too much (break into smaller tests)
- Missing mocks for async operations

**Solutions:**

```javascript
// Mock async operations to avoid waiting
jest.mock('../api', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'mocked' })
}));

// Mock components that trigger complex async behavior
jest.mock('../ComplexAsyncComponent', () => jest.fn(() => <div>Mocked</div>));

// Fix waitFor expectations to match actual output
// Before (never resolves)
await waitFor(() => expect(screen.getByText('Loading')).toBeInTheDocument());

// After (matches actual behavior)
await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument());

// Check for infinite loops - look for useEffect dependencies causing re-renders
// Solution: Mock the component triggering the loop
```

#### E. Missing Test Setup

**Pattern:** "ReferenceError: X is not defined"

**Fix:** Add missing test utilities or mocks

```javascript
// Mock missing globals
global.fetch = jest.fn();
global.IntersectionObserver = jest.fn();

// Mock missing modules
jest.mock('@fs/zion-analytics');
```

#### F. Assertion Failures

**Pattern:** "Expected X but received Y"

**Fix:** Update test expectations to match actual behavior (if production code is correct)

```javascript
// Before
expect(result).toBe('old-value');

// After (matching current production behavior)
expect(result).toBe('new-value');
```

#### G. Testing Library Patterns

This codebase uses `@fs/zion-testing-library` (wrapper around React Testing Library) and Jest.

**Never write Enzyme code** (no `.find()`, `.simulate()`, `.shallow()`, etc.)

**Use proper patterns:**

```javascript
// Use zionRender (async) instead of render
import { zionRender, screen, waitFor } from '@fs/zion-testing-library';

it('renders component', async () => {
  await zionRender(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});

// User interactions with userEvent
import userEvent from '@testing-library/user-event';

it('handles click', async () => {
  const user = userEvent.setup();
  await zionRender(<Button />);
  await user.click(screen.getByRole('button'));
});

// Query by role/text/label, not by class/id
screen.getByRole('button', { name: 'Submit' });
screen.getByText('Hello World');
screen.getByLabelText('Email');

// Mock complex child components to simplify tests
jest.mock('../ComplexComponent', () => jest.fn(() => <div>Mocked</div>));
```

#### H. Prefer Simulated Input Over Mock Data

**IMPORTANT:** When writing or fixing tests, prefer generating data through simulated user interactions rather than passing mock data as props.

**Why:** Tests should simulate real user behavior. This makes tests more realistic, catches more bugs, and better reflects actual usage patterns.

**Preferred Pattern - Simulated Input:**

```javascript
// GOOD: Generate data through user interaction
it('should save form data when user submits', async () => {
  const user = userEvent.setup();
  const onSave = jest.fn();

  await zionRender(<PersonForm onSave={onSave} />);

  // Simulate user typing
  await user.type(screen.getByLabelText('First Name'), 'John');
  await user.type(screen.getByLabelText('Last Name'), 'Doe');
  await user.type(screen.getByLabelText('Birth Date'), '1990-01-01');

  // Simulate user clicking save
  await user.click(screen.getByRole('button', { name: 'Save' }));

  // Verify the data was processed correctly
  await waitFor(() => {
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'John',
      lastName: 'Doe',
      birthDate: '1990-01-01'
    }));
  });
});
```

**Avoid - Mock Data Props:**

```javascript
// AVOID: Passing pre-filled mock data as props
it('should save form data when user submits', async () => {
  const user = userEvent.setup();
  const onSave = jest.fn();
  const mockData = {
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '1990-01-01'
  };

  // This bypasses actual user interaction
  await zionRender(<PersonForm initialData={mockData} onSave={onSave} />);

  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(onSave).toHaveBeenCalledWith(mockData);
});
```

**When to Use Mock Data:**

Mock data is appropriate when:
- Testing display/rendering of existing data (read-only views)
- The data comes from API responses (still mock the API, not the component props)
- Initial state is needed to test editing flows (but then use simulated input for changes)
- The component is a pure display component with no user interaction

**Examples:**

```javascript
// GOOD: Testing data display
it('displays person information', async () => {
  const person = { firstName: 'John', lastName: 'Doe' };
  await zionRender(<PersonCard person={person} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});

// GOOD: Testing edit flow with initial data + simulated input
it('allows editing person information', async () => {
  const user = userEvent.setup();
  const onSave = jest.fn();
  const initialPerson = { firstName: 'John', lastName: 'Doe' };

  await zionRender(<PersonForm person={initialPerson} onSave={onSave} />);

  // Clear and type new values (simulating user interaction)
  const firstNameInput = screen.getByLabelText('First Name');
  await user.clear(firstNameInput);
  await user.type(firstNameInput, 'Jane');

  await user.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => {
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'Jane',
      lastName: 'Doe'
    }));
  });
});

// GOOD: Testing API-driven data
it('loads and displays user data from API', async () => {
  // Mock the API call, not the component props
  jest.spyOn(api, 'fetchUser').mockResolvedValue({
    firstName: 'John',
    lastName: 'Doe'
  });

  await zionRender(<UserProfile userId="123" />);

  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

**Form Interactions Reference:**

```javascript
// Text inputs
await user.type(screen.getByLabelText('Name'), 'John');
await user.clear(screen.getByLabelText('Name'));

// Checkboxes and radio buttons
await user.click(screen.getByLabelText('Accept terms'));
await user.click(screen.getByLabelText('Option A'));

// Select dropdowns
await user.selectOptions(screen.getByLabelText('Country'), 'USA');

// Buttons
await user.click(screen.getByRole('button', { name: 'Submit' }));

// Multiple interactions in sequence
await user.type(screen.getByLabelText('Email'), 'test@example.com');
await user.type(screen.getByLabelText('Password'), 'password123');
await user.click(screen.getByRole('button', { name: 'Login' }));
```

### Step 4: Identify Outdated Tests (Optional)

If you encounter tests that fail because the production code no longer exists:

1. **Read the production code** to verify the feature/component was actually removed
2. **Check git history** if needed to understand when/why it was removed
3. **Use AskUserQuestion** to verify deletion is appropriate:
   ```javascript
   {
     question: "Should I delete the test for [ComponentName] since the component no longer exists?",
     header: "Delete test",
     options: [
       {
         label: "Yes, delete it",
         description: "The component was removed and the test is no longer relevant"
       },
       {
         label: "No, keep it",
         description: "The component might return or the test needs updating"
       }
     ]
   }
   ```
4. **Only delete** after user confirms

### Step 5: Verify Fixes

After applying fixes, re-run gitcha to verify:

```bash
node .claude/skills/gitcha/gitcha.js
```

If new errors appear, repeat the analysis and fix process.

## Common Patterns Quick Reference

| Error Pattern | Solution |
|--------------|----------|
| No tests found / Tests not running | NEVER skip - create test files or fix test patterns |
| Tempted to use .skip() | NEVER - fix the test instead |
| Test for deleted component/feature | Ask user via AskUserQuestion before deleting |
| Test is "too hard to fix" | Fix it anyway - difficulty is not a reason to delete |
| Component render error | Mock the component |
| "X is not a function" | Use requireActual in mock |
| React warning | Mock component causing warning |
| Missing key warning | Add keys in test or production code; only mock third-party components |
| Timeout | Fix infinite loops, mock async ops, fix waitFor expectations |
| Missing import | Add mock at top of file |
| Assertion mismatch | Update expectation (code is correct) |
| Deep render errors | Mock child components |

## Example Workflows

### Example 1: Fixing a Test with Mocking

User asks: "Run the test checks"

1. Run `node .claude/skills/gitcha/gitcha.js` command
2. Read `tests_simplified.txt`
3. Identify error: "Warning: Failed prop type: Invalid prop `onClose` of type `string` supplied to `Modal`"
4. Solution: Mock the Modal component
5. Edit test file to add mock:
   ```javascript
   jest.mock('@fs/zion-ui', () => ({
     ...jest.requireActual('@fs/zion-ui'),
     Modal: jest.fn(({ children }) => <div>{children}</div>)
   }));
   ```
6. Re-run `node .claude/skills/gitcha/gitcha.js` to verify fix

### Example 2: Handling Outdated Tests

User asks: "Run the test checks"

1. Run `node .claude/skills/gitcha/gitcha.js` command
2. Read `tests_simplified.txt`
3. Identify error: "Cannot find module '../components/OldLoginForm'"
4. Check if production code exists:
   ```bash
   # Search for the component
   find src -name "OldLoginForm.js"
   # Returns no results - component doesn't exist
   ```
5. Use AskUserQuestion:
   ```javascript
   {
     question: "The test file OldLoginForm.test.js is failing because OldLoginForm.js no longer exists. Should I delete this outdated test?",
     header: "Delete test",
     options: [
       {
         label: "Yes, delete it (Recommended)",
         description: "The component was removed and the test is no longer relevant"
       },
       {
         label: "No, investigate first",
         description: "The component might have been moved or renamed"
       }
     ]
   }
   ```
6. If user selects "Yes": Delete the test file using Bash:
   ```bash
   rm src/components/OldLoginForm.test.js
   ```
7. Re-run `node .claude/skills/gitcha/gitcha.js` to verify

## Best Practices

1. **NEVER skip tests** - Under no circumstances use .skip(), or comment out tests
2. **Get user approval before deleting** - Use AskUserQuestion to verify outdated tests before deletion
3. **Start with minimal mocking** - Only mock what's causing issues
4. **Use requireActual liberally** - Prevents cascading "not a function" errors
5. **Mock at the right level** - Mock leaf components, not utilities
6. **Keep test structure** - Don't change test logic, only setup/mocks
7. **Preserve test intent** - If a test is checking behavior X, keep checking X
8. **Group mocks together** - All jest.mock() calls at top of file
9. **Don't modify production code** - Tests adapt to code, not vice versa
10. **Verify tests actually ran** - Check output for test execution, not just "No tests found"
11. **Verify before deleting** - Check if production code exists before considering test deletion

## Invocation

Claude will automatically use this Skill when you ask:
- "Run the test checks"
- "Fix the failing tests"
- "Check for test issues"
- "Run /gitcha"

Or invoke manually with:
```
/gitcha
```

## Notes

- The gitcha command only runs if there's an open PR for the current branch
- It only tests files that changed between HEAD and the PR base branch
- All mocks should go at the TOP of test files, before other imports
- Always assume production code is correct and working
