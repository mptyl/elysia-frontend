# User Profile Management

## ADDED Requirements

### Requirement: Profile Data Loading
The system SHALL load the user's profile data from `public.user_profiles` joined with `public.org_units` when the profile page is accessed.

#### Scenario: Authenticated user accesses profile
- **WHEN** an authenticated user navigates to the profile page
- **THEN** the system fetches `user_profiles` record for `auth.uid()`
- **AND** joins with `org_units` to retrieve `ai_identity_base`
- **AND** displays the profile form with current values

#### Scenario: Profile not found
- **WHEN** no `user_profiles` record exists for the user
- **THEN** the system creates a new `user_profiles` record on-the-fly
- **AND** the new profile has no `org_unit_id` assigned (NULL)
- **AND** the form displays with empty/default values for all editable fields

---

### Requirement: Org Unit Selection
The system SHALL allow users to select or change their assigned organizational unit from a preloaded list of all available `org_units`.

#### Scenario: Select org unit
- **WHEN** user opens the org unit select dropdown
- **THEN** all `org_units` from the database are displayed
- **AND** the currently assigned org unit is pre-selected

#### Scenario: Change org unit
- **WHEN** user selects a different org unit
- **THEN** the `ai_identity_base` display updates to show the new org unit's base identity

---

### Requirement: AI Identity Base Display
The system SHALL display the `ai_identity_base` from the selected org unit as read-only content.

#### Scenario: Display base identity
- **WHEN** an org unit is selected
- **THEN** its `ai_identity_base` is displayed in a read-only field
- **AND** the field is clearly marked as non-editable

#### Scenario: No org unit selected
- **WHEN** no org unit is assigned to the user
- **THEN** the `ai_identity_base` field displays empty or placeholder text

---

### Requirement: AI Identity User Editor
The system SHALL provide a plain-text editor for users to modify their `ai_identity_user` field.

#### Scenario: Edit user identity
- **WHEN** user types in the AI identity user textarea
- **THEN** the input is captured without any text formatting
- **AND** supports multi-line content

---

### Requirement: AI Identity Mode Selection
The system SHALL allow users to select their `ai_identity_mode` as either `APPEND` or `REPLACE`.

#### Scenario: Select identity mode
- **WHEN** user selects an identity mode
- **THEN** the selected mode (`APPEND` or `REPLACE`) is captured for saving

---

### Requirement: Save Profile Changes
The system SHALL persist profile changes to the `user_profiles` table when the user clicks Save.

#### Scenario: Successful save
- **WHEN** user clicks the Save button
- **THEN** the system updates `org_unit_id`, `ai_identity_user`, and `ai_identity_mode` in `user_profiles`
- **AND** displays success feedback

#### Scenario: Save error
- **WHEN** the save operation fails
- **THEN** the system displays an error message
- **AND** does not navigate away from the form

---

### Requirement: Cancel Without Saving
The system SHALL navigate to the home page without saving changes when the user clicks Cancel.

#### Scenario: Cancel editing
- **WHEN** user clicks the Cancel button
- **THEN** no changes are persisted to the database
- **AND** the user is navigated to the home page (`/`)
