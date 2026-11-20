# create-siemens-web

A scaffolding CLI for Siemens web applications. Run a single command to generate a ready-to-use project with iX or Element components, theming, and tooling pre-configured.

> Based on [create-vite](https://github.com/vitejs/vite/tree/main/packages/create-vite).

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

Use `--template` to skip the design system and layout prompts. Interactive runs ask whether to apply the Siemens theme, defaulting to No. Use `--siemens-theme` to enable it without that prompt. Non-interactive runs default to `ix-angular-starter` without Siemens theming when no options are supplied. If the target directory already contains files, rerun with `--overwrite` to remove them first:

```bash
npm create siemens-web@latest my-app -- --template ix-react-starter --no-interactive
npm create siemens-web@latest my-app -- --template element-starter --overwrite --no-interactive
npm create siemens-web@latest my-app -- --template ix-angular-starter --siemens-theme --no-interactive
```

### Listing templates

Use `--list-templates` to list all templates, including overview layouts, without creating a project. Add `--json` for machine-readable output:

```bash
npm create siemens-web@latest -- --list-templates
npm --silent create siemens-web@latest -- --list-templates --json
```

**Note:** npm prints a command banner to stdout before launching the CLI. Pass npm's [`--silent` option](https://docs.npmjs.com/cli/v11/using-npm/logging#aliases) before `--` to keep redirected JSON valid:
