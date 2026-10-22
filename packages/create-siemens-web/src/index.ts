/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import util from 'node:util';
import type { SpawnOptions } from 'node:child_process';
import spawn from 'cross-spawn';
import mri from 'mri';
import * as prompts from '@clack/prompts';

const { red, green, yellow } = createColors();

type ColorFunc = (str: string) => string;
type Framework = {
  name: string;
  display: string;
  color: ColorFunc;
  variants: FrameworkVariant[];
};
type FrameworkVariant = {
  name: string;
  display: string;
  color: ColorFunc;
  requiresSiemensRegistry?: boolean;
};

const FRAMEWORKS: Framework[] = [
  {
    name: 'angular',
    display: 'Angular',
    color: red,
    variants: [
      {
        name: 'element-starter',
        display: 'Element (Angular)',
        color: red,
        requiresSiemensRegistry: true,
      },
      {
        name: 'ix-angular-starter',
        display: 'iX (Angular)',
        color: red,
      },
    ],
  },
  {
    name: 'react',
    display: 'React',
    color: green,
    variants: [
      {
        name: 'ix-react-starter',
        display: 'iX (React)',
        color: green,
      },
    ],
  },
  {
    name: 'vue',
    display: 'Vue',
    color: yellow,
    variants: [
      {
        name: 'ix-vue-starter',
        display: 'iX (Vue)',
        color: yellow,
      },
    ],
  },
];
const DEFAULT_TEMPLATE = 'ix-angular-starter';

const TEMPLATES = FRAMEWORKS.map(f => f.variants.map(v => v.name)).reduce(
  (a, b) => a.concat(b),
  [],
);

const SUPPORTED_PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun', 'deno'];
const PNPM_WORKSPACE = `allowBuilds:
  '@parcel/watcher': true
  esbuild: true
  lmdb: true
  msgpackr-extract: true
`;

const argv = mri<{
  template?: string;
  help?: boolean;
  overwrite?: boolean;
  immediate?: boolean;
  interactive?: boolean;
}>(process.argv.slice(2), {
  boolean: ['help', 'overwrite', 'immediate', 'interactive'],
  alias: { h: 'help', t: 'template', i: 'immediate' },
  string: ['template'],
});
const cwd = process.cwd();

// prettier-ignore
const helpMessage = `\
Usage: create-siemens-web [OPTION]... [DIRECTORY]

Create a new Siemens web application in JavaScript or TypeScript.
When running in TTY, the CLI will start in interactive mode.
DIRECTORY may be a relative or an absolute local path. UNC paths, symbolic link or junction are not supported.

Options:
  -t, --template NAME                   use a specific template
  -i, --immediate / --no-immediate      install dependencies and start dev
  --overwrite                           remove existing files when target directory is not empty
  --interactive / --no-interactive      force interactive / non-interactive mode
  -h, --help                            display this help message

Available templates:
${getListOfAllTemplates()}
`;

function getListOfAllTemplates() {
  return FRAMEWORKS.map(f => {
    const frameworkName = f.color(f.display || f.name);
    const variants = f.variants
      .map(v => {
        const marker = v.requiresSiemensRegistry ? ' (requires Siemens GitLab npm access)' : '';
        return `  - ${v.name}${marker}`;
      })
      .join('\n');
    return `${frameworkName}\n${variants}`;
  }).join('\n\n');
}

const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
  _editorconfig: '.editorconfig',
  _npmrc: '.npmrc',
  _prettierignore: '.prettierignore',
  '_stylelintrc.yml': '.stylelintrc.yml',
};

const defaultTargetDir = 'siemens-web-app';

function run([command, ...args]: string[], options?: SpawnOptions) {
  const { status, error, signal } = spawn.sync(command, args, options);
  if (error) {
    console.error(`\n${command} ${args.join(' ')} failed to start!`);
    console.error(error);
    process.exitCode = 1;
    throw error;
  }
  if (typeof status === 'number' && status > 0) {
    process.exitCode = status;
    throw new Error(`${command} exited with code ${status}`);
  }
  if (signal) {
    process.exitCode = 1;
    throw new Error(`${command} was terminated by ${signal}`);
  }
}

function install(root: string, agent: string) {
  if (process.env._TEST_CLI) {
    prompts.log.step('Installing dependencies... (skipped in test)');
    return;
  }
  prompts.log.step(`Installing dependencies with ${agent}...`);
  run(getInstallCommand(agent), {
    stdio: 'inherit',
    cwd: root,
  });
}

const applyPackageManagerAdjustments = (root: string, agent: string) => {
  if (agent === 'pnpm') {
    // Approve packages which allowed to run scripts during installation to ensure pnpm install succeeds
    fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), PNPM_WORKSPACE, { flag: 'wx' });
  }
};

function start(root: string, agent: string, script: string) {
  if (process.env._TEST_CLI) {
    prompts.log.step(`Starting "${script}" with ${agent}... (skipped in test)`);
    return;
  }
  prompts.log.step(`Starting "${script}" with ${agent}...`);
  run(getRunCommand(agent, script), {
    stdio: 'inherit',
    cwd: root,
  });
}

async function init() {
  const argTargetDir = argv._[0];
  const argTemplate = argv.template;
  const argOverwrite = argv.overwrite;
  const argImmediate = argv.immediate;
  const argInteractive = argv.interactive;

  if (argv.help) {
    console.log(helpMessage);
    return;
  }

  const interactive = argInteractive ?? process.stdin.isTTY;
  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent);
  const pkgManager =
    pkgInfo && SUPPORTED_PACKAGE_MANAGERS.includes(pkgInfo.name) ? pkgInfo.name : 'npm';

  const cancel = () => {
    process.exitCode = 1;
    prompts.cancel('Operation cancelled');
  };
  const fail = (message: string) => {
    process.exitCode = 1;
    prompts.log.error(message);
  };

  // 1. Get project name and target dir
  let targetDir = argTargetDir;
  if (!targetDir || targetDir.trim().length === 0) {
    if (interactive) {
      const projectName = await prompts.text({
        message: 'Project name:',
        defaultValue: defaultTargetDir,
        placeholder: defaultTargetDir,
        validate: value => {
          return value && value.trim().length > 0 ? undefined : 'Invalid project path';
        },
      });
      if (prompts.isCancel(projectName)) return cancel();
      targetDir = projectName;
    } else {
      targetDir = defaultTargetDir;
    }
  }

  // 2. Resolve the destination once, before any filesystem mutation
  const root = path.resolve(cwd, targetDir);

  if (isUncPath(targetDir) || isUncPath(root)) {
    return fail('UNC paths are not supported. Use a local directory instead.');
  }

  // Safety: never treat the filesystem root as a scaffold destination
  if (path.parse(root).root === root) {
    return fail(`Refusing to scaffold into the filesystem root "${root}".`);
  }

  // 3. Reject a linked target and require --overwrite for non-empty destinations
  const targetDirError = validateTargetDir(root, argOverwrite);
  if (targetDirError) {
    return fail(targetDirError);
  }

  // 4. Choose a framework and variant
  let template = argTemplate;
  let hasInvalidArgTemplate = false;
  if (argTemplate && !TEMPLATES.includes(argTemplate)) {
    hasInvalidArgTemplate = true;
    template = undefined;
    if (!interactive) {
      return fail(
        `Unknown template "${argTemplate}". Available templates:\n  ${TEMPLATES.join('\n  ')}`,
      );
    }
  }
  if (!template) {
    if (interactive) {
      const framework = await prompts.select({
        message: hasInvalidArgTemplate
          ? `"${argTemplate}" isn't a valid template. Please choose from below:`
          : 'Select a framework:',
        options: FRAMEWORKS.map(framework => {
          const frameworkColor = framework.color;
          return {
            label: frameworkColor(framework.display || framework.name),
            value: framework,
          };
        }),
      });
      if (prompts.isCancel(framework)) return cancel();

      const variant = await prompts.select({
        message: 'Select a variant:',
        options: framework.variants.map(variant => ({
          label: variantLabel(variant),
          value: variant.name,
        })),
      });
      if (prompts.isCancel(variant)) return cancel();

      template = variant;
    } else {
      template = DEFAULT_TEMPLATE;
    }
  }

  // 5. Validate the template before touching the destination
  const templateDir = path.resolve(fileURLToPath(import.meta.url), '../..', `template-${template}`);
  if (!fs.existsSync(templateDir)) {
    return fail(`Template "${template}" is not shipped with this version.`);
  }

  let templatePkg: { name?: string; scripts?: Record<string, string> };
  try {
    templatePkg = JSON.parse(fs.readFileSync(path.join(templateDir, 'package.json'), 'utf-8'));
  } catch {
    return fail(`Template "${template}" has an invalid package.json.`);
  }

  const runScript = getRunScript(templatePkg);

  const selectedVariant = FRAMEWORKS.flatMap(f => f.variants).find(v => v.name === template);
  if (selectedVariant?.requiresSiemensRegistry) {
    prompts.log.warn(
      'This template requires access to the Siemens GitLab npm registry to install "@simpl/brand". Configure your registry credentials before installing, otherwise dependency installation will fail.',
    );
  }

  // 6. Get package name
  let packageName = path.basename(root);
  if (!isValidPackageName(packageName)) {
    if (interactive) {
      const packageNameResult = await prompts.text({
        message: 'Package name:',
        defaultValue: toValidPackageName(packageName),
        placeholder: toValidPackageName(packageName),
        validate(dir) {
          if (dir && !isValidPackageName(dir)) {
            return 'Invalid package.json name';
          }
        },
      });
      if (prompts.isCancel(packageNameResult)) return cancel();
      packageName = packageNameResult;
    } else {
      packageName = toValidPackageName(packageName);
    }
  }

  // 7. Ask about immediate install
  let immediate = argImmediate;
  if (immediate === undefined) {
    if (interactive) {
      const immediateResult = await prompts.confirm({
        message: `Install with ${pkgManager} and start now?`,
      });
      if (prompts.isCancel(immediateResult)) return cancel();
      immediate = immediateResult;
    } else {
      immediate = false;
    }
  }

  const allFiles = walkTemplateDir(templateDir);

  // Check again, since the target directory may have changed while prompts were open
  const latestTargetDirError = validateTargetDir(root, argOverwrite);
  if (latestTargetDirError) {
    return fail(latestTargetDirError);
  }

  // 8. Commit: delete first only after everything was validated
  prompts.log.step(`Scaffolding project in ${root}...`);
  if (argOverwrite) {
    emptyDir(root);
  }
  fs.mkdirSync(root, { recursive: true });

  const writeTemplate = (relPath: string, content?: string) => {
    const isTopLevel = !relPath.includes(path.sep);
    const basename = path.basename(relPath);
    const renamedBasename = isTopLevel ? (renameFiles[basename] ?? basename) : basename;
    const targetPath = path.join(root, path.dirname(relPath), renamedBasename);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    if (content !== undefined) {
      fs.writeFileSync(targetPath, content, { flag: 'wx' });
    } else if (basename === 'index.html') {
      const templateContent = fs.readFileSync(path.join(templateDir, relPath), 'utf-8');
      const updatedContent = templateContent.replace(
        /<title>.*?<\/title>/,
        `<title>${packageName}</title>`,
      );
      fs.writeFileSync(targetPath, updatedContent, { flag: 'wx' });
    } else {
      fs.copyFileSync(path.join(templateDir, relPath), targetPath, fs.constants.COPYFILE_EXCL);
    }
  };

  for (const file of allFiles.filter(f => f !== 'package.json')) {
    writeTemplate(file);
  }

  const pkg = { ...templatePkg, name: packageName };

  writeTemplate('package.json', JSON.stringify(pkg, null, 2) + '\n');

  applyPackageManagerAdjustments(root, pkgManager);

  if (immediate) {
    install(root, pkgManager);
    start(root, pkgManager, runScript);
  } else {
    let doneMessage = '';
    const cdProjectName = path.relative(cwd, root);
    doneMessage += 'Done. Now run:\n';
    if (root !== cwd) {
      const cdPath = argTargetDir ?? cdProjectName;
      const label = cdPath.includes(' ') ? `"${cdPath}"` : cdPath;
      doneMessage += `\n  cd ${label}`;
    }
    doneMessage += `\n  ${getInstallCommand(pkgManager).join(' ')}`;
    doneMessage += `\n  ${getRunCommand(pkgManager, runScript).join(' ')}`;
    prompts.outro(doneMessage);
  }
}

function walkTemplateDir(dir: string, prefix = ''): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = prefix ? path.join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) {
      result.push(...walkTemplateDir(path.join(dir, entry.name), relPath));
    } else {
      result.push(relPath);
    }
  }
  return result;
}

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName);
}

function isUncPath(targetDir: string) {
  const normalizedPath = targetDir.replaceAll('\\', '/');

  if (/^\/\/[?.]\//.test(normalizedPath)) {
    return /^\/\/[?.]\/unc(?:\/|$)/i.test(normalizedPath);
  }

  return /^\/\/[^/]/.test(normalizedPath);
}

const validateTargetDir = (targetDir: string, overwrite = false): string | undefined => {
  // lstat() doesn't follow a link at the target itself, unlike the fs calls used for scaffolding.
  // Links in parent folders are followed the same way by both, so they're allowed.
  const stats = fs.lstatSync(targetDir, { throwIfNoEntry: false });
  if (!stats) {
    return undefined;
  }
  if (stats.isSymbolicLink()) {
    return `Target path "${targetDir}" is a symbolic link or junction. Use a regular directory instead.`;
  }
  if (!stats.isDirectory()) {
    return `Target path "${targetDir}" is not a directory.`;
  }
  if (!overwrite && !isEmpty(targetDir)) {
    return (
      (targetDir === cwd ? `Current directory "${cwd}"` : `Target directory "${targetDir}"`) +
      ' is not empty. Rerun with --overwrite to remove existing files and continue.'
    );
  }
  return undefined;
};

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-');
}

function isEmpty(dirPath: string) {
  const files = fs.readdirSync(dirPath);
  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === '.git') {
      continue;
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

interface PkgInfo {
  name: string;
  version?: string;
}

function pkgFromUserAgent(userAgent: string | undefined): PkgInfo | undefined {
  if (!userAgent) return undefined;
  const pkgSpec = userAgent.split(' ')[0];
  const pkgSpecArr = pkgSpec.split('/');
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  };
}

function getRunScript(pkg: { scripts?: Record<string, string> }): string {
  if (pkg.scripts?.dev) return 'dev';
  if (pkg.scripts?.start) return 'start';
  prompts.log.warn('The template does not define a "dev" or "start" script.');
  return 'dev';
}

function variantLabel(variant: FrameworkVariant) {
  const suffix = variant.requiresSiemensRegistry ? ' (requires Siemens GitLab npm access)' : '';
  return variant.color((variant.display || variant.name) + suffix);
}

function getInstallCommand(agent: string) {
  if (agent === 'yarn') {
    return [agent];
  }
  return [agent, 'install'];
}

function getRunCommand(agent: string, script: string) {
  switch (agent) {
    case 'yarn':
    case 'pnpm':
    case 'bun':
      return [agent, script];
    case 'deno':
      return [agent, 'task', script];
    default:
      return [agent, 'run', script];
  }
}

type ColorName = Exclude<Parameters<typeof util.styleText>[0], unknown[]>;

function createColors() {
  return new Proxy({} as Record<ColorName, ColorFunc>, {
    get(_, prop: ColorName) {
      return (str: string) => util.styleText(prop, str);
    },
  });
}

init().catch(e => {
  if (process.exitCode === undefined) {
    process.exitCode = 1;
  }
  console.error(e instanceof Error ? `\n${e.message}` : `\n${String(e)}`);
});
