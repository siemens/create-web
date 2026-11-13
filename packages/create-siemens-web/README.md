# create-siemens-web

A scaffolding CLI for Siemens web applications. Run a single command to generate a ready-to-use project with iX or Element components, theming, and tooling pre-configured.

> Based on [create-vite](https://github.com/vitejs/vite/tree/main/packages/create-vite).

## Prerequisites

Most templates depend only on public packages. All **Element** templates depend on `@simpl/brand`, which is only available from the Siemens GitLab npm registry. To use them you need:

- Access to the [Siemens GitLab npm registry](https://code.siemens.com) for the `@simpl` scope
- Your registry credentials configured, for example through an `.npmrc` entry such as:

```ini
//code.siemens.com/api/v4/projects/732/packages/npm/:_authToken=${SIEMENS_NPM_TOKEN}
```

Without access, `npm install` fails for Element-based projects. The iX templates do not require this registry.

## Scaffolding Siemens web applications

With NPM:

```bash
npm create siemens-web@latest
```

With Yarn:

```bash
yarn create siemens-web
```

With PNPM:

```bash
pnpm create siemens-web
```

With Bun:

```bash
bun create siemens-web
```

With Deno:

```bash
deno init --npm siemens-web
```

## CLI usage

Use `--template` to skip both selection prompts. Non-interactive runs default to `ix-angular-starter` when no template is supplied. If the target directory already contains files, rerun with `--overwrite` to remove them first:

```bash
npm create siemens-web@latest my-app -- --template ix-react-starter --no-interactive
npm create siemens-web@latest my-app -- --template element-starter --overwrite --no-interactive
```
