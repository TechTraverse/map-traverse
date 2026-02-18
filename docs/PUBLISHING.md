# Publishing Workflow

This repository uses [Changesets](https://github.com/changesets/changesets) and GitHub Actions to automate versioning and publishing to npm.

## Prerequisites

To publish packages, the following secrets must be configured in the GitHub repository settings:

- `NPM_TOKEN`: An automation token from npm with permission to publish the packages.
- `GITHUB_TOKEN`: This is automatically provided by GitHub Actions, but **workflow permissions** must be configured to allow creating Pull Requests.
    - Go to **Settings** > **Actions** > **General** > **Workflow permissions**.
    - Select **"Allow GitHub Actions to create and approve pull requests"**.

## Development Workflow

When you make changes that require a version bump (e.g., a new feature or a bug fix), you need to add a "changeset" before merging to `main`.

1.  **Make your code changes** as usual.
2.  **Run the changeset command**:
    ```bash
    pnpm changeset
    ```
3.  **Follow the prompts**:
    - Select the packages you changed (space to select/deselect).
    - Choose the semver bump type (`patch`, `minor`, or `major`).
    - Enter a summary of the changes.
4.  **Commit the generated file**:
    - This creates a markdown file in the `.changeset/` directory.
    - Commit this file along with your code changes.

```bash
git add .
git commit -m "feat: adding cool map feature"
git push
```

## Release Workflow

The release process is fully automated via the `.github/workflows/release.yml` pipeline.

1.  **Version Packages (Automated PR)**
    - When code with a changeset is merged into `main`, the CI pipeline runs.
    - It aggregates all the changesets and creates a new Pull Request titled **"Version Packages"**.
    - This PR creates a "Version Release" branch that:
        - Bumps versions in `package.json`.
        - Updates `CHANGELOG.md` files.
        - Deletes the individual changeset files.

2.  **Publish to npm**
    - **Review** the "Version Packages" PR to ensure versions/changelogs look correct.
    - **Merge** the PR into `main`.
    - The CI pipeline detects the merge and runs `pnpm release` (which runs `changeset publish`).
    - Packages are published to npm and GitHub Releases are created.

## Troubleshooting

### "GitHub Actions is not permitted to create or approve pull requests"
If the "Version Packages" PR is not created and you see this error in the GitHub Actions logs, ensure you have enabled the workflow permission mentioned in [Prerequisites](#prerequisites). If your organization enforces this setting, you may need to use a Personal Access Token (PAT) instead.

### "ERR_PNPM_LOCKFILE_CONFIG_MISMATCH"
Ensure your local `pnpm` version matches the one specified in `package.json` (`packageManager` field) and the CI workflow. We pin the pnpm version to avoid lockfile format issues between local development and CI.
