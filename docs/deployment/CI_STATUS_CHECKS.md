# Enabling CI status checks

To ensure the new CI workflow gatekeeps merges, enable required status checks on GitHub:

1. Navigate to **Settings → Branches**.
2. Edit the protection rule for the `main` branch (or create one if it does not exist).
3. Enable **Require status checks to pass before merging** and add the `CI` workflow for each Node version job (for example, `CI (Node 18)` and `CI (Node 20)`).
4. Optionally enable **Require branches to be up to date** so pull requests include the latest commits.

Repeat these steps for each protected release branch pattern you use so that pull requests cannot be merged unless the CI pipeline succeeds.
