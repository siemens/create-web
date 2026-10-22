# create-siemens-web

A scaffolding CLI for Siemens web applications. Run a single command to generate a ready-to-use project with iX or Element components, theming, and tooling pre-configured.

> Based on [create-vite](https://github.com/vitejs/vite/tree/main/packages/create-vite).

## Prerequisites

Most templates depend only on public packages. The **Element** template (`element-starter`) depends on `@simpl/brand`, which is only available from the Siemens GitLab npm registry. To use it you need:

- Access to the [Siemens GitLab npm registry](https://code.siemens.com) for the `@simpl` scope
- Your registry credentials configured, for example through an `.npmrc` entry such as:

```ini
//code.siemens.com/api/v4/projects/732/packages/npm/:_authToken=${SIEMENS_NPM_TOKEN}
```

Without access, `npm install` fails for Element-based projects. The iX starters (`ix-angular-starter`, `ix-react-starter`, `ix-vue-starter`) do not require this registry.

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

Non-interactive runs require an explicit template. If the target directory already contains files, rerun with `--overwrite` to remove them first:

```bash
npm create siemens-web@latest my-app -- --template ix-react-starter --no-interactive
npm create siemens-web@latest my-app -- --template element-starter --overwrite --no-interactive
```
