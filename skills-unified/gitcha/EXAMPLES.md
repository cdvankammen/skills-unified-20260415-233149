# `/gitcha` Skill - Real-World Examples

This document shows real examples of how the `/gitcha` skill analyzes and fixes different types of test issues.

## Example 1: Component Render Error

### Input (from tests_simplified.txt)
```
FAIL src/RIP/components/generic/eventsCard/components/EventForm.test.js
  ● EventForm › renders with primary event

    TypeError: Cannot read property 'open' of undefined

      (...Stack Trace)

(src/RIP/components/generic/eventsCard/components/EventForm.test.js:45:20)
```

### Analysis
- Test file: `EventForm.test.js`
- Error: Component trying to access a prop that doesn't exist in the mock
- Likely cause: Child component needs mocking

### Fix Applied
```javascript
// Added to top of EventForm.test.js
jest.mock('@fs/zion-ui', () => ({
  ...jest.requireActual('@fs/zion-ui'),
  Modal: jest.fn(({ children, isOpen }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null
  )
}));
```

### Result
✅ Test passes - Modal component properly mocked with needed props

---

## Example 2: "X is not a function" Error

### Input
```
FAIL src/RIP/components/generic/essentialInformationCard/EssentialInformationCard.test.js
  ● EssentialInformationCard › handles date selection

    TypeError: formatDate is not a function

      (...Stack Trace)

(src/RIP/components/generic/essentialInformationCard/utils/dateUtils.js:23:12)
```

### Analysis
- Error: `formatDate` not available
- Likely cause: Wholesale mock removed utility functions
- Check for existing mock of `dateUtils`

### Original Problematic Mock
```javascript
jest.mock('../../utils/dateUtils');
```

### Fix Applied
```javascript
jest.mock('../../utils/dateUtils', () => ({
  ...jest.requireActual('../../utils/dateUtils'), // Keep real implementations
  // Only mock what's needed for the test
}));
```

### Result
✅ Test passes - All utility functions remain available, can mock specific ones if needed

---

## Example 3: React Warning

### Input
```
PASS src/RIP/components/generic/familyMembersCard/FamilyMembersCard.test.js
  ● Console

    console.error
      Warning: Can't perform a React state update on an unmounted component.
      This is a no-op, but it indicates a memory leak in your application.

      (...Stack Trace)

(src/RIP/components/generic/familyMembersCard/components/PersonRow.js:78:14)
```

### Analysis
- Tests pass but warnings appear
- Component: `PersonRow` has async state updates
- Cause: Component unmounts before async operation completes

### Fix Applied
```javascript
// Mock the component to prevent async operations in tests
jest.mock('../components/PersonRow', () =>
  jest.fn(({ person, onEdit }) => (
    <div data-testid="person-row">
      {person.name}
      <button onClick={onEdit}>Edit</button>
    </div>
  ))
);
```

### Result
✅ Tests pass without warnings - PersonRow mocked to avoid async cleanup issues

---

## Example 4: Multiple Console Logs (Noise)

### Input
```
PASS src/RIP/components/generic/eventsCard/components/EventForm.test.js
  ● Console

    console.log
      EventForm basepath: events.primary[0]

      (...Stack Trace)

(src/RIP/components/generic/eventsCard/components/EventForm.js:52:11)

    console.log
      field.dates: [ { id: 'date-1', subElements: [] } ]

      (...Stack Trace)

(src/RIP/components/generic/eventsCard/components/EventForm.js:53:11)

    [... 50 more console.log entries ...]
```

### Analysis
- Tests passing
- Console logs are debug statements in production code
- Not a test issue, but creates noise

### Action Taken
```
Note: Tests are passing. The console.log statements appear to be debug
code in EventForm.js lines 52-56. These should be removed from production
code when debugging is complete, but tests don't need modification.
```

### Result
✅ No action needed - Tests work correctly

---

## Example 5: Timeout Error

### Input
```
FAIL src/RIP/views/indexing/IndexingView.test.js
  ● IndexingView › loads data on mount

    Exceeded timeout of 5000ms for a test.
    Use jest.setTimeout(newTimeout) to increase the timeout value, if this is a long-running test.

      (...Stack Trace)

(src/RIP/views/indexing/IndexingView.test.js:89:3)
```

### Analysis
- Test timing out during data load
- Likely cause: Real API calls or slow operations
- Solution: Mock async operations

### Fix Applied
```javascript
// Mock the data loading hook
jest.mock('../../hooks/useIndexingData', () => ({
  useIndexingData: jest.fn(() => ({
    data: mockIndexingData,
    loading: false,
    error: null
  }))
}));
```

### Result
✅ Test completes instantly - Async operations mocked

---

## Example 6: Prop Type Warning

### Input
```
PASS src/RIP/components/generic/additionalFactsCard/AdditionalFactsCard.test.js
  ● Console

    console.error
      Warning: Failed prop type: Invalid prop `onSave` of type `string`
      supplied to `Button`, expected `function`.

      (...Stack Trace)

(node_modules/@fs/zion-ui/Button/Button.js:34:14)
```

### Analysis
- Test passing but prop type warning
- Component receiving wrong prop type in test setup
- Issue in test mock, not production code

### Original Test Code
```javascript
const mockProps = {
  onSave: 'handleSave' // Wrong: string instead of function
};
```

### Fix Applied
```javascript
const mockProps = {
  onSave: jest.fn() // Correct: actual function
};
```

### Result
✅ Test passes without warnings - Proper prop types used

---

## Example 7: Missing Import

### Input
```
FAIL src/RIP/components/generic/eventsCard/EventsCard.test.js
  ● EventsCard › renders event list

    ReferenceError: zionRender is not defined

      (...Stack Trace)

(src/RIP/components/generic/eventsCard/EventsCard.test.js:12:5)
```

### Analysis
- Test uses `zionRender` but doesn't import it
- Common with @fs/zion-testing-library

### Fix Applied
```javascript
// Added to imports at top of EventsCard.test.js
import { zionRender } from '@fs/zion-testing-library';
```

### Result
✅ Test passes - Missing import added

---

## Example 8: Assertion Mismatch (Production Code Changed)

### Input
```
FAIL src/RIP/components/generic/eventsCard/utils/events.utils.test.js
  ● getEventLabel › returns correct label for BIRTH event

    expect(received).toBe(expected)

    Expected: "Birth"
    Received: "Birth Event"

      (...Stack Trace)

(src/RIP/components/generic/eventsCard/utils/events.utils.test.js:45:29)
```

### Analysis
- Production code changed event labels
- Test expectations outdated
- **Assuming production code is correct** (core principle)

### Fix Applied
```javascript
// Updated expectation in test
expect(getEventLabel('BIRTH')).toBe('Birth Event'); // Was: 'Birth'
```

### Result
✅ Test passes - Expectation matches new production behavior

---

## Example 9: Complex Nested Component Error

### Input
```
FAIL src/RIP/views/fullText/FullTextView.test.js
  ● FullTextView › renders with image data

    TypeError: Cannot read property 'highlights' of undefined
      at ImageBrowser (src/RIP/components/r2imageBrowser/ImageBrowser.js:89:45)
      at SplitScreenContainer (src/RIP/components/splitScreenContainer/SplitScreenContainer.js:123:12)

      (...Stack Trace)

(src/RIP/views/fullText/FullTextView.test.js:67:10)
```

### Analysis
- Deep component tree causing errors
- ImageBrowser inside SplitScreenContainer needs data
- Mock at appropriate level to avoid deep rendering

### Fix Applied
```javascript
// Mock the container component, not the leaf
jest.mock('../../components/splitScreenContainer/SplitScreenContainer', () =>
  jest.fn(({ children }) => (
    <div data-testid="split-screen-container">{children}</div>
  ))
);
```

### Result
✅ Test passes - Container mocked, avoiding deep rendering issues

---

## Example 10: Multiple Failures in One File

### Input
```
FAIL src/RIP/components/generic/familyMembersCard/FamilyMembersCard.test.js
  ● FamilyMembersCard › renders person list

    TypeError: useRelationships is not a function

  ● FamilyMembersCard › handles add person

    TypeError: Modal is not defined

  ● FamilyMembersCard › validates relationships

    Warning: Can't perform state update on unmounted component
```

### Analysis
- Multiple issues in one test file
- Hook not mocked: `useRelationships`
- Component not imported: `Modal`
- Async cleanup issue

### Fix Applied
```javascript
// Mock the custom hook
jest.mock('../../hooks/useRelationships', () => ({
  useRelationships: jest.fn(() => ({
    relationships: [],
    addRelationship: jest.fn(),
    removeRelationship: jest.fn()
  }))
}));

// Mock Modal component
jest.mock('@fs/zion-ui', () => ({
  ...jest.requireActual('@fs/zion-ui'),
  Modal: jest.fn(({ children, isOpen }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null
  )
}));

// Add cleanup
afterEach(() => {
  jest.clearAllMocks();
});
```

### Result
✅ All tests pass - Multiple issues resolved with targeted mocks

---

## Common Patterns Summary

| Error Type | First Action | If That Fails |
|------------|-------------|---------------|
| Component render error | Mock the component | Mock parent component |
| "X is not a function" | Add requireActual | Check mock syntax |
| React warning | Mock causing component | Add cleanup |
| Timeout | Mock async operations | Increase timeout |
| Missing import | Add import | Check package.json |
| Assertion mismatch | Update expectation | Verify production code |
| Prop type warning | Fix test props | Mock component |

---

## Decision Flow

When analyzing test output:

```
1. Is test FAILING or just WARNING?
   ├─ FAILING → Must fix
   └─ WARNING → Should fix if possible

2. Where is the error?
   ├─ In test file → Fix test setup
   └─ In production file → Mock component

3. What's the error type?
   ├─ TypeError → Check mocks/imports
   ├─ ReferenceError → Add import/mock
   ├─ React Warning → Mock component or add cleanup
   ├─ Timeout → Mock async operations
   └─ Assertion → Update expectation

4. After fixing, always:
   ├─ Re-run check
   └─ Verify no new issues introduced
```

---

## Tips for Success

1. **Read the full error message** - File path shows where to fix
2. **Check existing mocks first** - Don't duplicate mocks
3. **Start minimal** - Add requireActual, then mock selectively
4. **Group mocks at top** - Keep test file organized
5. **Test your fix** - Always re-run check
6. **Document why** - Add comment explaining non-obvious mocks

---

## When to Stop

Stop and ask for guidance if:
- Same error persists after 3 different fix attempts
- Errors multiply instead of decrease
- Production code appears to have the issue
- Circular dependency errors appear
- Tests pass locally but fail in CI

These situations may need architectural changes or human decision-making.
