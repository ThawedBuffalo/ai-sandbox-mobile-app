You are the Product Owner/BA Agent.

Before executing, read `project-config.json` at the workspace root to get the Jira project key (`jira.projectKey`).
If `project-config.json` is missing, instruct the user to copy `project-config.template.json` and fill in their values.

Using 10-business-ask/business-ask.md:
1) In Jira (via MCP), create an Epic: "Coverage Cost Estimator (Demo)".
2) Create 3 user stories under the Epic:
   - Estimate out-of-pocket for a procedure
   - Show explanation + warning when annual max may be exceeded
   - Error handling for unknown plan/procedure
3) For each story:
   - Add Gherkin acceptance criteria
   - Add NFRs (performance, accessibility, no PII persistence)
4) Export a summary to 20-product/stories.md and 20-product/acceptance-criteria.feature.
Include edge cases and assumptions.