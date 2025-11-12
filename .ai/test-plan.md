# Test Plan for the "10xbadger" Project

## 1. Introduction and Testing Objectives

### 1.1. Introduction

This document constitutes a comprehensive test plan for the "10xbadger" application, a system for managing competency badges and promotion processes. The project is based on a modern technology stack, including Astro, React, TypeScript, and Supabase, which requires a multi-level approach to quality assurance. This plan defines the strategy, scope, resources, and schedule of testing activities aimed at verifying the application's functionality, reliability, performance, and security.

### 1.2. Testing Objectives

The main objectives of the testing process are:
*   **Verification of Functional Compliance:** Ensuring that all implemented features work in accordance with the specification (described in the `types.ts` files and service logic).
*   **Ensuring Data Integrity:** Verifying that all data operations (CRUD) are performed correctly and that relationships between entities (badges, applications, templates, promotions) are maintained.
*   **Validation of Business Logic:** Confirming the correct operation of complex processes, such as the badge application lifecycle, promotion validation against a template, and the acceptance/rejection process.
*   **Identification and Elimination of Defects:** Detecting bugs at the earliest possible stage of development to minimize the cost of fixing them.
*   **Verification of Permissions and Security:** Ensuring that authorization mechanisms work correctly and that users (standard and administrators) only have access to authorized resources and actions.
*   **Assessment of User Experience (UX) Quality:** Checking whether the interface is intuitive, responsive, and free of visual errors.

## 2. Scope of Testing

### 2.1. Functionalities Included in Testing

The following modules and functionalities of the application will be tested:
1.  **Authentication and Authorization Module:**
    *   User registration.
    *   Login and logout.
    *   "Forgot password" mechanism.
    *   Role differentiation (standard user, administrator).
    *   Protection of routes and API endpoints.
2.  **Badge Catalog:**
    *   Browsing and filtering the badge catalog.
    *   Displaying badge details.
    *   Creating, editing, and deactivating badges (administrator role).
3.  **Badge Applications:**
    *   Creating a new application based on a badge from the catalog.
    *   Saving a draft and auto-saving.
    *   Editing and deleting a draft.
    *   Submitting an application for review.
    *   Application lifecycle (status changes: `draft` -> `submitted` -> `accepted`/`rejected`).
    *   Viewing details of one's own and (for admin) others' applications.
4.  **Admin Review Queue:**
    *   Filtering and sorting the list of applications for review.
    *   Accepting and rejecting applications (with an optional note).
    *   Displaying metrics and statistics.
5.  **Promotion Templates:**
    *   Browsing, filtering, and sorting templates.
    *   Creating, editing, and deactivating templates (administrator role).
    *   Defining rules (required number of badges of a given category and level).
6.  **Promotion Management:**
    *   Creating a new promotion based on a template.
    *   Adding and removing accepted badges to/from a promotion.
    *   Real-time validation of the promotion against template rules.
    *   Submitting a promotion for approval.
    *   Promotion lifecycle (status changes: `draft` -> `submitted` -> `approved`/`rejected`).

### 2.2. Functionalities Excluded from Testing

At this stage, testing will not cover:
*   Performance tests under high load (stress tests).
*   Integration tests with external notification systems (e.g., email), unless they are critical to the workflow.
*   Tests of purely static informational pages (e.g., the welcome page), beyond basic rendering verification.

## 3. Types of Tests

The following types of tests will be conducted in the project:

*   **Unit Tests:**
    *   **Objective:** To verify the correctness of isolated code fragments, such as helper functions, validation logic (Zod schemas), pure functions in React components, and service logic with mocked dependencies (e.g., the Supabase client).
    *   **Location:** `*.spec.ts` and `*.spec.tsx` files in `__tests__` folders.

*   **Component Tests:**
    *   **Objective:** To verify rendering, interaction, and state management in React components. To check if components react correctly to input data (props) and user actions.
    *   **Location:** `*.spec.tsx` files in the `__tests__` folders of individual components.

*   **Integration Tests:**
    *   **Objective:** To verify the cooperation between different parts of the system. They will focus on:
        *   Testing API endpoints (Astro routes) for input data validation, business logic, and response format. Business services and the database will be mocked.
        *   Testing the integration of React hooks with the components that use them.
        *   Testing the cooperation of components within a single view (e.g., `AdminReviewView` and its subcomponents).

*   **End-to-End (E2E) Tests:**
    *   **Objective:** To simulate real-world usage scenarios of the application from the user's perspective. To verify complete business flows in an environment similar to production.
    *   **Tools:** Cypress or Playwright.
    *   **Sample Scenarios:**
        1.  Full application lifecycle: login -> find a badge -> create an application -> save draft -> edit -> submit for review.
        2.  Application review by an admin: log in as admin -> find the application -> accept/reject -> check status change.
        3.  Creating and validating a promotion: collect several accepted badges -> create a promotion -> add badges -> verify requirements are met -> submit for approval.

*   **Manual Exploratory Testing:**
    *   **Objective:** To detect unforeseen errors by freely using the application, testing edge cases, and non-standard interactions.
    *   **Responsibility:** QA team.

## 4. Test Scenarios for Key Functionalities

Below are high-level sample test scenarios (happy path and negative cases).

### 4.1. Authentication and Authorization
| Scenario ID | Description | Expected Result | Priority |
| :--- | :--- | :--- | :--- |
| AUTH-01 | Login using correct credentials. | The user is logged in and redirected to the main dashboard. | Critical |
| AUTH-02 | Login using an incorrect password. | An error message about incorrect credentials is displayed. | Critical |
| AUTH-03 | Attempt to access a protected page (e.g., `/`) without being logged in. | The user is redirected to the login page. | Critical |
| AUTH-04 | Attempt to access the admin panel (`/admin/review`) as a regular user. | Access is denied, and the user is redirected to an authorization error page. | Critical |
| AUTH-05 | Logging out of the system. | The user's session is terminated, and they are redirected to the login page. | High |

### 4.2. Badge Application Lifecycle
| Scenario ID | Description | Expected Result | Priority |
| :--- | :--- | :--- | :--- |
| BA-01 | A user creates and saves a draft of an application. | The application is saved in the database with the status `draft`. | Critical |
| BA-02 | A user edits and submits a draft for review. | The application's status changes to `submitted`, and the fields are locked for editing. | Critical |
| BA-03 | An administrator accepts an application in the `submitted` state. | The application's status changes to `accepted`, and the reviewer's data is saved. | Critical |
| BA-04 | An administrator rejects an application in the `submitted` state, providing a reason. | The application's status changes to `rejected`, and the reason for rejection is saved. | Critical |
| BA-05 | A user attempts to edit an application with a status other than `draft`. | The edit action is impossible (button is missing or disabled). | High |
| BA-06 | An attempt to add an application with a status other than `accepted` to a promotion. | The application is not visible on the list of available badges in the promotion builder. | High |

### 4.3. Promotion Management
| Scenario ID | Description | Expected Result | Priority |
| :--- | :--- | :--- | :--- |
| PROMO-01 | A user creates a new, empty promotion based on an active template. | The promotion is created in the database with the status `draft`. | Critical |
| PROMO-02 | A user adds accepted badges to the promotion. | The badges are linked to the promotion. The validation view is updated. | Critical |
| PROMO-03 | The system correctly validates the promotion as "meeting requirements" when all template rules are satisfied. | The "Submit for Approval" button becomes active. | Critical |
| PROMO-04 | The system correctly validates the promotion as "not meeting requirements" and indicates the missing badges. | The "Submit for Approval" button is inactive. | Critical |
| PROMO-05 | An attempt to add the same accepted badge to two different promotions in `draft` state. | The second attempt to add results in a conflict error (`ReservationConflictError`). | High |
| PROMO-06 | A user submits a correctly validated promotion for approval. | The promotion's status changes to `submitted`, and the associated badges' status changes to `used_in_promotion`. | Critical |

## 5. Test Environment

*   **Development Environment (Local):** Used for unit and component tests, run locally by developers.
*   **Test Environment (Staging):** A dedicated, isolated instance of the application deployed in a cloud infrastructure. It will be connected to a separate Supabase database instance, populated with test data. Integration, E2E, and manual tests will be conducted in this environment.
*   **Database:** A separate Supabase instance for the test environment, containing a defined set of test data (users with different roles, badges, applications, templates).

## 6. Testing Tools

*   **Unit and Component Testing Framework:** Vitest (as configured in the project).
*   **React Component Testing Library:** React Testing Library (as configured in the project).
*   **E2E Testing Framework:** Playwright (recommended for its speed and advanced features, alternatively Cypress).
*   **Bug Reporting System:** Jira (or alternatives: Trello, GitHub Issues).
*   **Browser Developer Tools:** For element inspection, debugging, and network traffic analysis.
*   **CI/CD:** GitHub Actions (for automatically running unit and integration tests after every push to the repository).

## 7. Testing Schedule

The testing process will be conducted in parallel with the development process.

## 8. Test Acceptance Criteria

### 8.1. Entry Criteria
*   The test plan is available.
*   The test environment is configured and accessible.
*   Functionalities intended for testing are deployed to the test environment.

### 8.2. Exit Criteria
*   All defined test scenarios (critical and high) have been executed.
*   At least 95% of automated tests pass successfully.
*   No open critical (blocking) bugs.
*   The number of open high-priority bugs is in line with the project team's agreement.
*   Test results documentation has been prepared and accepted.

## 9. Roles and Responsibilities

*   **QA Engineer:** Responsible for creating and maintaining the test plan, designing and executing test scenarios (manual and automated), reporting bugs, and verifying fixes.
*   **Developers:** Responsible for creating unit and component tests, fixing reported bugs, and assisting in diagnosing issues.
*   **Project Manager:** Oversees the testing schedule, prioritizes bugs, and makes decisions about product release.

## 10. Bug Reporting Procedures

All detected bugs will be reported in the Jira system (or another selected tool) and should include the following information:

*   **Title:** A concise and unambiguous description of the problem.
*   **Environment:** Indication of where the bug occurred (e.g., staging).
*   **Steps to Reproduce:** A detailed, numbered list of steps leading to the bug's occurrence.
*   **Actual Result:** A description of what happened.
*   **Expected Result:** A description of what should have happened.
*   **Priority:** (Critical, High, Medium, Low) - defining the bug's impact on the system.
*   **Attachments:** Screenshots, video recordings, console logs.
*   **Application/Browser Version:** Information about the environment where the bug was observed.

Each reported bug will go through a lifecycle: `New` -> `In Analysis` -> `To Do` -> `In Progress` -> `In Review` -> `Closed` or `Rejected`.
