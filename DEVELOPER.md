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

The repository includes `ix-theme-downloader` (`packages/theme-download`) to download and unpack corporate theme assets for deployment previews in CI:

```shell
# Download and unpack corporate theme (requires SIEMENS_NPM_TOKEN and BRAND_URL)
pnpm run download:theme
```

## Releases

We use [Release Please](https://github.com/googleapis/release-please) to automate versioning, changelog generation, and npm publishing based on [Conventional Commits](https://www.conventionalcommits.org/).

When pull requests are merged to `main`, Release Please updates or opens a release PR. Once that release PR is merged, GitHub Actions builds and publishes the package to npm automatically.
