# E2E Tests

This directory contains end-to-end (E2E) tests using Playwright.

## Structure

```
e2e/
├── pages/              # Page Object Models
│   └── LoginPage.ts   # Login page POM
├── LoginPage.spec.ts    # Login page E2E tests
└── README.md          # This file
```

## Page Object Model (POM)

We use the Page Object Model pattern for maintainable and reusable test code. Each page in the application has a corresponding class in the `pages/` directory that encapsulates:

- Locators for page elements
- Methods for interacting with the page
- Assertions specific to the page

### Example Usage

```typescript
import { LoginPage } from "./pages/LoginPage";

test("should log in successfully", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login("user@example.com", "password");
  // Assert redirect or success
});
```

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode (interactive)
pnpm test:e2e:ui

# Debug tests step-by-step
pnpm test:e2e:debug

# Generate tests by recording interactions
pnpm test:e2e:codegen

# View test report
pnpm test:e2e:report
```

## Writing New Tests

1. **Create a Page Object Model** (if testing a new page):
   - Create a new file in `e2e/pages/`
   - Define locators and methods
   - Export the class

2. **Create a test file**:
   - Create `*.spec.ts` file in the `e2e/` directory
   - Import the Page Object Model
   - Write test cases using `test.describe()` and `test()`

3. **Follow best practices**:
   - Use descriptive test names
   - Group related tests with `test.describe()`
   - Use `test.beforeEach()` for common setup
   - Use resilient locators (prefer roles, labels, test IDs)
   - Add comments for complex test flows

## Test Organization

Tests are organized by feature:

- **Page Rendering**: Verify UI elements load correctly
- **Form Validation**: Test input validation and error handling
- **User Interactions**: Test button clicks, form submissions, etc.
- **Navigation**: Test links and routing
- **Error Handling**: Test error states and messages

## Configuration

E2E test configuration is in `playwright.config.ts` at the project root.

Key settings:
- **Browser**: Chromium only (per project guidelines)
- **Base URL**: http://localhost:3000
- **Screenshots**: Captured on failure
- **Video**: Recorded on failure
- **Traces**: Captured on retry
