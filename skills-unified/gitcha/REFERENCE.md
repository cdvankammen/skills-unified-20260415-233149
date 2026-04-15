# Test Fixing Reference Guide

This file provides detailed examples for common test fixing scenarios encountered when using the `/gitcha` skill.

## Table of Contents

1. [Mock Patterns](#mock-patterns)
2. [requireActual Usage](#requireactual-usage)
3. [Zion Package Mocking](#zion-package-mocking)
4. [React Hook Mocking](#react-hook-mocking)
5. [Context Provider Mocking](#context-provider-mocking)
6. [Async Operation Handling](#async-operation-handling)

---

## Mock Patterns

### Basic Component Mock

```javascript
// Mock a simple component
jest.mock('../Button', () => jest.fn(() => <div>Button</div>));

// Mock with props pass-through
jest.mock('../Button', () =>
  jest.fn(({ children, onClick }) => (
    <button onClick={onClick}>{children}</button>
  ))
);

// Mock with testid for querying
jest.mock('../Button', () =>
  jest.fn(({ children, ...props }) => (
    <button data-testid="mocked-button" {...props}>{children}</button>
  ))
);
```

### Named Export Mocks

```javascript
// Multiple named exports
jest.mock('../components', () => ({
  Header: jest.fn(() => <div>Header</div>),
  Footer: jest.fn(() => <div>Footer</div>),
  Sidebar: jest.fn(() => <div>Sidebar</div>)
}));

// Mix of components and functions
jest.mock('../utils', () => ({
  formatDate: jest.fn((date) => '2024-01-01'),
  parseDate: jest.fn((str) => new Date(str)),
  DatePicker: jest.fn(() => <div>DatePicker</div>)
}));
```

### Default + Named Exports

```javascript
jest.mock('../Module', () => ({
  __esModule: true,
  default: jest.fn(() => <div>Default Export</div>),
  namedExport: jest.fn(),
  AnotherComponent: jest.fn(() => <div>Named Component</div>)
}));
```

---

## requireActual Usage

### Partial Module Mock

```javascript
// Keep most of module, mock one function
jest.mock('../utils/helpers', () => ({
  ...jest.requireActual('../utils/helpers'),
  fetchData: jest.fn().mockResolvedValue({ data: 'mocked' })
}));

// Keep all utilities, mock one component
jest.mock('../components/Card', () => ({
  ...jest.requireActual('../components/Card'),
  Card: jest.fn(() => <div>Mocked Card</div>)
}));
```

### Preserving Constants/Types

```javascript
// Keep constants and types, mock functions
jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  // CONSTANTS and ENUMS remain real
  apiCall: jest.fn()
}));
```

### Mocking with Original Implementation Access

```javascript
jest.mock('../utils', () => {
  const actual = jest.requireActual('../utils');
  return {
    ...actual,
    processData: jest.fn((data) => {
      // Can call actual.processData if needed
      return { mocked: true };
    })
  };
});
```

---

## Zion Package Mocking

Zion packages (@fs/zion-*) are commonly used and frequently need mocking.

### @fs/zion-ui Components

```javascript
jest.mock('@fs/zion-ui', () => ({
  ...jest.requireActual('@fs/zion-ui'),
  Modal: jest.fn(({ children, isOpen }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null
  ),
  Button: jest.fn(({ children, onClick }) =>
    <button onClick={onClick}>{children}</button>
  ),
  Input: jest.fn((props) => <input {...props} />)
}));
```

### @fs/zion-router

```javascript
jest.mock('@fs/zion-router', () => ({
  ...jest.requireActual('@fs/zion-router'),
  useNavigate: jest.fn(() => jest.fn()),
  useParams: jest.fn(() => ({ id: 'test-id' })),
  useLocation: jest.fn(() => ({ pathname: '/test' }))
}));
```

### @fs/zion-analytics

```javascript
jest.mock('@fs/zion-analytics', () => ({
  trackEvent: jest.fn(),
  trackPageView: jest.fn(),
  useAnalytics: jest.fn(() => ({
    trackEvent: jest.fn()
  }))
}));
```

### @fs/zion-session

```javascript
jest.mock('@fs/zion-session', () => ({
  ...jest.requireActual('@fs/zion-session'),
  useSession: jest.fn(() => ({
    user: { id: 'user-123', name: 'Test User' },
    isAuthenticated: true
  })),
  SessionProvider: jest.fn(({ children }) => <>{children}</>)
}));
```

### @fs/zion-locale

```javascript
jest.mock('@fs/zion-locale', () => ({
  ...jest.requireActual('@fs/zion-locale'),
  useTranslation: jest.fn(() => ({
    t: (key) => key,
    i18n: { language: 'en' }
  }))
}));
```

---

## React Hook Mocking

### useState Mock

```javascript
// Mock useState for controlled testing
const mockSetState = jest.fn();
jest.spyOn(React, 'useState').mockImplementation((init) => [init, mockSetState]);
```

### useEffect Mock

```javascript
// Prevent useEffect from running
jest.spyOn(React, 'useEffect').mockImplementation((f) => f());
```

### Custom Hook Mock

```javascript
// Mock custom hook
jest.mock('../hooks/useCustomData', () => ({
  useCustomData: jest.fn(() => ({
    data: { id: 1, name: 'Test' },
    loading: false,
    error: null
  }))
}));

// Mock with multiple return scenarios
const mockUseCustomData = jest.fn();
jest.mock('../hooks/useCustomData', () => ({
  useCustomData: mockUseCustomData
}));

// In test
mockUseCustomData.mockReturnValue({ data: null, loading: true });
```

---

## Context Provider Mocking

### Simple Provider Mock

```javascript
jest.mock('../context/ThemeContext', () => ({
  ThemeProvider: jest.fn(({ children }) => <>{children}</>),
  useTheme: jest.fn(() => ({
    theme: 'light',
    setTheme: jest.fn()
  }))
}));
```

### Provider with Complex State

```javascript
jest.mock('../context/AppContext', () => ({
  AppProvider: jest.fn(({ children }) => <>{children}</>),
  useAppContext: jest.fn(() => ({
    state: {
      user: { id: '123' },
      settings: { darkMode: false }
    },
    dispatch: jest.fn(),
    actions: {
      login: jest.fn(),
      logout: jest.fn(),
      updateSettings: jest.fn()
    }
  }))
}));
```

### Multiple Context Mocks

```javascript
jest.mock('../context', () => ({
  AuthProvider: jest.fn(({ children }) => <>{children}</>),
  useAuth: jest.fn(() => ({ user: { id: '1' }, isAuthenticated: true })),

  DataProvider: jest.fn(({ children }) => <>{children}</>),
  useData: jest.fn(() => ({ data: [], loading: false })),

  UIProvider: jest.fn(({ children }) => <>{children}</>),
  useUI: jest.fn(() => ({ modal: null, toast: jest.fn() }))
}));
```

---

## Async Operation Handling

### Promise Mock

```javascript
// Mock async function
jest.mock('../api', () => ({
  fetchUser: jest.fn().mockResolvedValue({ id: '1', name: 'User' }),
  updateUser: jest.fn().mockResolvedValue({ success: true }),
  deleteUser: jest.fn().mockRejectedValue(new Error('Not found'))
}));
```

### setTimeout/setInterval

```javascript
// Use fake timers
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// In test
jest.advanceTimersByTime(1000);
```

### Async Component Loading

```javascript
// Mock dynamic imports
jest.mock('../LazyComponent', () => ({
  __esModule: true,
  default: jest.fn(() => <div>Lazy Component</div>)
}));
```

### API Call Mock with Multiple Responses

```javascript
const mockFetch = jest.fn();
mockFetch
  .mockResolvedValueOnce({ data: 'first call' })
  .mockResolvedValueOnce({ data: 'second call' })
  .mockRejectedValueOnce(new Error('third call fails'));

jest.mock('../api', () => ({
  fetch: mockFetch
}));
```

---

## Error Pattern Solutions

### "Cannot read property 'X' of undefined"

**Cause:** Mock removed exports or object wasn't provided

**Solution:**
```javascript
// Before (breaks)
jest.mock('../utils');

// After (works)
jest.mock('../utils', () => ({
  ...jest.requireActual('../utils')
}));

// Or provide the missing property
jest.mock('../utils', () => ({
  someObject: { X: 'value' }
}));
```

### "X.mockReturnValue is not a function"

**Cause:** Tried to use jest.fn() methods on non-mocked function

**Solution:**
```javascript
// Ensure function is actually mocked
jest.mock('../utils', () => ({
  myFunction: jest.fn() // Now mockReturnValue works
}));

// Or in test setup
const mockFn = jest.fn();
jest.mock('../utils', () => ({
  myFunction: mockFn
}));
```

### "Warning: React does not recognize the `mockProp` prop"

**Cause:** Mock passed props to DOM element that aren't valid HTML attributes

**Solution:**
```javascript
// Before (warning)
jest.mock('../Component', () =>
  jest.fn((props) => <div {...props}>Content</div>)
);

// After (clean)
jest.mock('../Component', () =>
  jest.fn(({ children, className }) => <div className={className}>{children}</div>)
);
```

---

## Quick Decision Tree

```
Test failing?
├─ Component render error?
│  ├─ Mock the component
│  └─ Use requireActual for components you need
│
├─ "X is not a function"?
│  ├─ Add requireActual to preserve real exports
│  └─ Check if mock is using jest.fn()
│
├─ React warning?
│  ├─ Mock component causing warning
│  └─ Add cleanup in afterEach
│
├─ Timeout?
│  ├─ Mock async operations
│  └─ Use jest.useFakeTimers()
│
├─ Assertion mismatch?
│  └─ Update expectation (code is correct)
│
└─ Unclear error?
   └─ Read stack trace for file path, check imports/mocks
```

---

## Testing Anti-Patterns to Avoid

1. **Don't modify production code** - Tests should adapt to code
2. **Don't mock everything** - Only mock what causes issues
3. **Don't ignore warnings** - They indicate real problems in tests
4. **Don't copy-paste blindly** - Understand what each mock does
5. **Don't remove tests** - Fix them instead
6. **Don't change test assertions without understanding** - Make sure you know why it's changing

---

## When to Ask for Help

If you encounter:
- Circular dependency errors that mocking doesn't fix
- Tests that pass locally but fail in CI
- Persistent timeout issues after mocking async operations
- Type errors in TypeScript that mocking doesn't resolve

These may require deeper architectural changes or user guidance.
