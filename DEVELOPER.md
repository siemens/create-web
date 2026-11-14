# Developing Siemens Create Web

## Prerequisites

- [Git](https://git-scm.com/) to clone the repository
- [NodeJS](https://nodejs.org/) version as specified in [package.json](package.json) (v22 or higher)
- [pnpm](https://pnpm.io/) v12 or higher: enable via [corepack](https://nodejs.org/api/corepack.html) (`corepack enable`) or install with `npm install -g pnpm`

## Installation

Setting up the development environment:

```shell
git clone git@github.com:siemens/create-web.git
cd create-siemens-web
pnpm install
```

## Building

The CLI package `create-siemens-web` is built using [tsdown](https://github.com/sxzz/tsdown).

To build packages use the available pnpm scripts:

```shell
# Build all packages in the workspace
pnpm run build

# Build create-siemens-web only
pnpm run build:create
```

## Running the CLI locally

During development, you can run the build in watch mode or execute the CLI directly:

```shell
# Watch mode for create-siemens-web
pnpm build:create

# Link the local package rather than fetch a registry version
cd packages/create-siemens-web
npm link

# Run the CLI in interactive mode
npm init siemens-web

# Run the CLI with arguments
npm init siemens-web -- . --template ix-react-starter
```

## Linting and formatting

We use [ESLint](https://eslint.org/) for linting and [Prettier](https://prettier.io/) for formatting.
Use the following pnpm scripts to lint and format the code:

```shell
# Format all files
pnpm run format

# Check formatting without modifying files
pnpm run lint:format

# Lint all packages
pnpm run lint
```

## Unit Tests

We use [Vitest](https://vitest.dev/) for unit and CLI integration tests.
Run the unit tests using the corresponding pnpm scripts:

```shell
# Run all tests across workspace packages
pnpm run test

# Run tests specifically for create-siemens-web
pnpm --filter create-siemens-web test
```

## Corporate theme downloader

The repository includes `ix-theme-downloader` (`packages/theme-download`) as a standalone utility to download and unpack corporate theme assets in CI:

```shell
# Download and unpack corporate theme (requires SIEMENS_NPM_TOKEN and BRAND_URL)
pnpm run download:theme
```

## Releases

We use [Release Please](https://github.com/googleapis/release-please) to automate versioning, changelog generation, and npm publishing based on [Conventional Commits](https://www.conventionalcommits.org/).

After changes are merged to `main`, the workflow runs. Release Please creates or updates a release PR when it finds releasable Conventional Commits since the previous release. Merging that release PR causes GitHub Actions to build and publish the package to npm automatically.

### Promoting a prerelease to a stable release

The [`release-please-config.json`](release-please-config.json) uses the `prerelease` versioning strategy with `prerelease: true` and `prerelease-type: "rc"` to produce release candidates such as `0.1.0-rc.2`.

To promote a release candidate to stable:

1. Change `prerelease` to `false` in `release-please-config.json` and merge the change to `main`. Keep `versioning: "prerelease"`; the `prerelease` setting controls whether the calculated version has an RC suffix and whether the GitHub release is marked as a prerelease.
2. Release Please needs a releasable commit since the previous release, such as a `fix:` or `feat:` commit. A config-only `chore` and manually rerunning the workflow do not force a release PR. If the current RC is ready as-is and there are no new releasable commits, add a `Release-As` footer to a commit on `main` for the intended stable version. For example, to promote `0.1.0-rc.2` to `0.1.0`:

   ```text
   chore(release): promote 0.1.0-rc.2 to stable

   Release-As: 0.1.0
   ```

   If using a pull request, make sure the final commit message on `main` contains the footer.

3. The workflow runs automatically on pushes to `main`. If a run was missed, use **Actions → Release Please → Run workflow** on `main`; this reruns the normal commit checks.
4. Review and merge the stable release PR. This creates a new stable tag and GitHub release (for example, `v0.1.0`) and triggers the build and npm publish job. Do not promote the existing RC by only changing its prerelease checkbox in GitHub; that does not update the package version or run this release workflow.

Set `prerelease` back to `true` before merging changes for the next RC cycle; those changes still need to include a releasable commit. See the [Release Please manifest configuration](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md#configfile), [version override guidance](https://github.com/googleapis/release-please#how-do-i-change-the-version-number), and this repository's [release workflow](.github/workflows/release-please.yml) for details.
