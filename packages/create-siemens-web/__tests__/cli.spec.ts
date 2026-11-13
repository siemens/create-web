/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import type { SyncOptions } from 'execa';
import { execa, execaSync } from 'execa';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import type { ScaffoldConfig, TemplatePackage } from '../src/template';

const CLI_PATH = path.join(import.meta.dirname, '..');

const projectName = 'test-app';
const fixtureRoutes = "export const route = { path: '/' };\nexport const routes = [route];\n";
const designSystems = [
  {
    display: 'Element Angular',
    name: 'element',
    dependency: '@siemens/element-ng',
    script: 'start',
    layouts: ['blank', 'starter'],
  },
  {
    display: 'iX React',
    name: 'ix-react',
    dependency: '@siemens/ix-react',
    script: 'dev',
    layouts: ['starter'],
  },
  {
    display: 'iX Angular',
    name: 'ix-angular',
    dependency: '@siemens/ix-angular',
    script: 'start',
    layouts: ['starter'],
  },
  {
    display: 'iX Vue',
    name: 'ix-vue',
    dependency: '@siemens/ix-vue',
    script: 'dev',
    layouts: ['starter'],
  },
];
const templateChoices = [
  {
    display: 'Blank',
    name: 'blank',
    description: 'A bare-bone project setup without any pages or examples',
  },
  {
    display: 'Starter',
    name: 'starter',
    description: 'A project setup with sample pages to get started quickly',
  },
];
const templateSelections = designSystems.flatMap((designSystem, designSystemIndex) =>
  designSystem.layouts.map((layout, templateIndex) => {
    const choice = templateChoices.find(({ name }) => name === layout)!;
    const availableChoices = designSystem.layouts.map(supportedLayout =>
      templateChoices.find(({ name }) => name === supportedLayout)!,
    );
    return {
      ...designSystem,
      availableChoices,
      template: `${designSystem.name}-${choice.name}`,
      layout: choice.name,
      description: choice.description,
      designSystemInput: '\x1b[B'.repeat(designSystemIndex) + '\r',
      templateInput: '\x1b[B'.repeat(templateIndex) + '\r',
    };
  }),
);
let genRoot: string;
const genPath = () => path.join(genRoot, projectName);

const run = (args: string[], options?: SyncOptions, cliPath = CLI_PATH) => {
  return execaSync(process.execPath, [cliPath, ...args], {
    env: { ...process.env, _TEST_CLI: 'true' },
    ...options,
  });
};

const runInteractive = async (
  args: string[],
  steps: { prompt: string; input: string; beforeInput?: () => void }[],
  cliPath = CLI_PATH,
  env?: NodeJS.ProcessEnv,
) => {
  const subprocess = execa(process.execPath, [cliPath, ...args], {
    cwd: genRoot,
    env: { ...process.env, _TEST_CLI: 'true', ...env },
    reject: false,
    timeout: 5000,
  });
  try {
    for (const { prompt, input, beforeInput } of steps) {
      let stdout = '';
      const promptShown = new Promise<void>(resolve => {
        const onData = (data: Buffer) => {
          stdout += data.toString();
          if (stdout.includes(prompt)) {
            subprocess.stdout.off('data', onData);
            resolve();
          }
        };
        subprocess.stdout.on('data', onData);
      });
      await Promise.race([
        promptShown,
        subprocess.then(() => {
          throw new Error(`CLI exited before displaying "${prompt}".`);
        }),
      ]);
      beforeInput?.();
      subprocess.stdin.write(input);
    }
    subprocess.stdin.end();
    return await subprocess;
  } finally {
    subprocess.kill();
  }
};

const createTempDir = () => {
  // os.tmpdir() can contain symlinks (e.g. /var -> /private/var on macOS).
  // The CLI resolves the destination against the real CWD, so the fixture
  // directory must use the resolved path to match printed output.
  return fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'create-siemens-web-'));
};

// Helper to create a non-empty directory
const createNonEmptyDir = (dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true });

  const pkgJson = path.join(dirPath, 'package.json');
  fs.writeFileSync(pkgJson, '{ "foo": "bar" }');
  fs.writeFileSync(path.join(dirPath, 'sentinel.txt'), 'Keep existing contents.\n');
  fs.mkdirSync(path.join(dirPath, 'nested'));
  fs.writeFileSync(path.join(dirPath, 'nested', 'sentinel.txt'), 'Keep nested contents.\n');
};

type DirectorySnapshot = {
  [name: string]: string | DirectorySnapshot;
};

const snapshotDir = (dir: string): DirectorySnapshot => {
  const snapshot: DirectorySnapshot = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      snapshot[entry.name] = `link:${fs.readlinkSync(entryPath)}`;
    } else if (entry.isDirectory()) {
      snapshot[entry.name] = snapshotDir(entryPath);
    } else {
      snapshot[entry.name] = fs.readFileSync(entryPath, 'base64');
    }
  }
  return snapshot;
};

const directoryLinkType = process.platform === 'win32' ? 'junction' : 'dir';

const createCliFixture = () => {
  const cliDir = path.join(genPath(), 'cli');
  const cliPath = path.join(cliDir, 'dist', 'index.mjs');
  fs.mkdirSync(path.dirname(cliPath), { recursive: true });
  fs.copyFileSync(path.join(CLI_PATH, 'dist', 'index.mjs'), cliPath);
  for (const { name } of designSystems.filter(system => system.name !== 'ix-react')) {
    const directory = path.join(cliDir, `template-${name}`);
    fs.mkdirSync(directory);
    fs.copyFileSync(
      path.join(CLI_PATH, `template-${name}`, 'scaffold.json'),
      path.join(directory, 'scaffold.json'),
    );
  }
  return { cliPath, templateDir: path.join(cliDir, 'template-ix-react') };
};

const createScaffoldFixture = (): ScaffoldConfig => ({
  id: 'ix-react',
  name: 'iX React',
  layouts: templateChoices.map(choice => ({
    id: choice.name,
    name: choice.display,
    description: choice.description,
    scaffold:
      choice.name === 'overview'
        ? { includeLayouts: ['blank', 'starter'], preserveHierarchy: true }
        : { dependencies: [] },
  })),
  scaffold: { routesFile: 'src/app/app.routes.tsx', dependencies: [] },
});

const createTemplateFixture = (templateDir: string) => {
  const files = {
    'package.json': JSON.stringify({ scripts: { dev: 'vite' }, dependencies: {} }),
    'scaffold.json': JSON.stringify(createScaffoldFixture()),
    'src/app/app.routes.tsx': 'export const routes = [];\n',
    'src/app/layouts/blank/routes.tsx': fixtureRoutes,
    'src/app/layouts/starter/routes.tsx': fixtureRoutes,
  };
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(templateDir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
};

type PackageManagerCall = {
  manager: string;
  args: string[];
  cwd: string;
  projectName: string;
};

const createPackageManagerFixture = (manager: string, installExitCode = 0) => {
  const directory = path.join(genPath(), 'package-manager');
  const log = path.join(directory, 'calls.jsonl');
  const script = path.join(import.meta.dirname, 'fixtures/package-manager.mjs');
  fs.mkdirSync(directory, { recursive: true });
  const command = path.join(directory, manager + (process.platform === 'win32' ? '.cmd' : ''));
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
  const content =
    process.platform === 'win32'
      ? `@echo off\r\n"${process.execPath}" "${script}" ${manager} %*\r\nexit /b %errorlevel%\r\n`
      : `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(script)} ${quote(manager)} "$@"\n`;
  fs.writeFileSync(command, content, { mode: 0o755 });
  return {
    log,
    env: {
      ...process.env,
      _TEST_CLI: '',
      PATH: directory + path.delimiter + process.env.PATH,
      npm_config_user_agent: `${manager}/1.0.0`,
      PACKAGE_MANAGER_LOG: log,
      PACKAGE_MANAGER_INSTALL_EXIT_CODE: String(installExitCode),
    },
    calls: (): PackageManagerCall[] =>
      fs
        .readFileSync(log, 'utf-8')
        .trim()
        .split('\n')
        .map(line => JSON.parse(line) as PackageManagerCall),
  };
};

const expectProjectReferencesToResolve = (directory: string) => {
  const sourceRoot = path.join(directory, 'src');
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.html', '.scss', '.css'];
  const files = fs
    .readdirSync(sourceRoot, { recursive: true, encoding: 'utf-8' })
    .filter(file => extensions.includes(path.extname(file)));
  for (const file of files) {
    const absolutePath = path.join(sourceRoot, file);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    for (const [, reference] of content.matchAll(
      /(?:\bfrom\s+|\bimport\s*(?:\(\s*)?|\b(?:templateUrl|styleUrl)\s*:\s*|\bsrc\s*=\s*|@(?:use|forward|import)\s+|\burl\(\s*)['"](\.[^'"]+)['"]/g,
    )) {
      const target = path.resolve(path.dirname(absolutePath), reference.split(/[?#]/)[0]);
      const candidates = [
        target,
        ...extensions.flatMap(extension => [
          target + extension,
          path.join(target, 'index' + extension),
        ]),
        path.join(path.dirname(target), '_' + path.basename(target) + '.scss'),
        path.join(target, '_index.scss'),
      ];
      expect(
        candidates.some(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()),
        `${file} references missing file ${reference}`,
      ).toBe(true);
    }
  }
};

const clearAnyPreviousFolders = () => {
  if (genRoot && fs.existsSync(genRoot)) {
    const projectDir = path.join(genRoot, projectName);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  }
};

beforeAll(() => {
  genRoot = createTempDir();
});

afterEach(() => clearAnyPreviousFolders());
afterAll(() => {
  fs.rmSync(genRoot, { recursive: true, force: true });
});

test('creates a project through the complete interactive flow', async () => {
  const { stdout, exitCode } = await runInteractive(
    ['--interactive', '--no-immediate'],
    [
      { prompt: 'Project name:', input: `${projectName}\r` },
      { prompt: 'Select design system and framework:', input: '\r' },
      { prompt: 'Select a template:', input: '\r' },
    ],
  );

  expect(exitCode).toBe(0);
  expect(stdout.indexOf('Project name:')).toBeLessThan(
    stdout.indexOf('Select design system and framework:'),
  );
  expect(stdout.indexOf('Select design system and framework:')).toBeLessThan(
    stdout.indexOf('Select a template:'),
  );
  expect(fs.readFileSync(path.join(genPath(), 'package.json'), 'utf-8')).toContain(projectName);
});

test.each(templateSelections)(
  'selects $template through the design system and template prompts',
  async ({
    layout,
    dependency,
    description,
    designSystemInput,
    templateInput,
    availableChoices,
  }) => {
    const { stdout, exitCode } = await runInteractive(
      [projectName, '--interactive', '--no-immediate'],
      [
        { prompt: 'Select design system and framework:', input: designSystemInput },
        { prompt: 'Select a template:', input: templateInput },
      ],
    );
    const generatedPkg: TemplatePackage = JSON.parse(
      fs.readFileSync(path.join(genPath(), 'package.json'), 'utf-8'),
    );

    expect(exitCode).toBe(0);
    for (const choice of availableChoices) {
      expect(stdout).toContain(choice.display);
    }
    expect(stripVTControlCharacters(stdout).replace(/[│\s]+/g, ' ')).toContain(description);
    expect(generatedPkg.name).toBe(projectName);
    expect(generatedPkg.dependencies).toHaveProperty(dependency);
    expect(fs.existsSync(path.join(genPath(), 'src/app/layouts'))).toBe(layout === 'overview');
  },
);

test('recovers from an invalid template with the new prompt flow', async () => {
  const { stdout, exitCode } = await runInteractive(
    [projectName, '--interactive', '--no-immediate', '--template', 'unknown'],
    [
      { prompt: 'Select design system and framework:', input: '\x1b[B\r' },
      { prompt: 'Select a template:', input: '\r' },
    ],
  );

  expect(exitCode).toBe(0);
  expect(stdout).toContain('"unknown" isn\'t a valid template. Please choose from below:');
  const packageJson = fs.readFileSync(path.join(genPath(), 'package.json'), 'utf-8');
  expect(packageJson).toContain('@siemens/ix-react');
});

describe('catalog initialization', () => {
  test.each([
    'missing template',
    'missing scaffold.json',
    'invalid scaffold.json',
    'mismatched manifest ID',
    'duplicate layout ID',
  ])('reports %s consistently for help and scaffolding', failure => {
    const { cliPath, templateDir } = createCliFixture();
    createTemplateFixture(templateDir);
    const configPath = path.join(templateDir, 'scaffold.json');
    const config = createScaffoldFixture();
    if (failure === 'missing template') {
      fs.rmSync(templateDir, { recursive: true, force: true });
    } else if (failure === 'missing scaffold.json') {
      fs.rmSync(configPath);
    } else if (failure === 'invalid scaffold.json') {
      fs.writeFileSync(configPath, '{ invalid JSON');
    } else {
      if (failure === 'mismatched manifest ID') {
        config.id = 'incorrect';
      } else {
        config.layouts.push(config.layouts[0]);
      }
      fs.writeFileSync(configPath, JSON.stringify(config));
    }

    const messages: Record<string, string> = {
      'missing template': 'Template "ix-react" is not shipped with this version.',
      'missing scaffold.json': 'has a missing or invalid scaffold.json.',
      'invalid scaffold.json': 'has a missing or invalid scaffold.json.',
      'mismatched manifest ID': 'must declare ID "ix-react".',
      'duplicate layout ID': 'declares duplicate layout ID "blank".',
    };
    const destination = path.join(genPath(), 'existing');
    createNonEmptyDir(destination);
    const existingContents = snapshotDir(destination);
    const invocations = [
      ['--help'],
      ['-h'],
      [destination, '--overwrite', '--template', 'ix-react-starter', '--no-interactive'],
      [destination, '--overwrite', '--template', 'ix-react-starter', '--interactive'],
    ];
    const results = invocations.map(args => run(args, { cwd: genRoot, reject: false }, cliPath));

    for (const result of results) {
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(messages[failure]);
      expect(result.stderr).toBe(results[0].stderr);
      expect(result.stdout).toBe('');
    }
    expect(snapshotDir(destination)).toEqual(existingContents);
  });

  test('reuses the loaded catalog for selection and generation', async () => {
    const { cliPath, templateDir } = createCliFixture();
    createTemplateFixture(templateDir);
    const destination = path.join(genPath(), 'generated');
    const result = await runInteractive(
      [destination, '--interactive', '--no-immediate'],
      [
        { prompt: 'Select design system and framework:', input: '\x1b[B\r' },
        {
          prompt: 'Select a template:',
          input: '\r',
          beforeInput: () => {
            fs.writeFileSync(path.join(templateDir, 'scaffold.json'), '{ invalid JSON');
          },
        },
      ],
      cliPath,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(fs.readFileSync(path.join(destination, 'src/app/app.routes.tsx'), 'utf-8')).toBe(
      fixtureRoutes,
    );
  });
});

describe('manifest selection metadata', () => {
  test('uses manifest names, descriptions and layout order in the CLI', async () => {
    const { cliPath, templateDir } = createCliFixture();
    createTemplateFixture(templateDir);
    const config = createScaffoldFixture();
    config.name = 'Fixture React';
    config.layouts = [config.layouts[1], config.layouts[0]];
    config.layouts[0].name = 'Sample fixture';
    config.layouts[0].description = 'A sample layout described by the manifest';
    config.layouts[1].name = 'Minimal fixture';
    fs.writeFileSync(path.join(templateDir, 'scaffold.json'), JSON.stringify(config));
    const help = run(['--help'], { cwd: genRoot }, cliPath);
    expect(help.stdout).toContain('Fixture React');
    expect(help.stdout).toContain('ix-react-starter');

    const destination = path.join(genPath(), 'generated');
    const { stdout, exitCode } = await runInteractive(
      [destination, '--interactive', '--no-immediate'],
      [
        { prompt: 'Select design system and framework:', input: '\x1b[B\r' },
        { prompt: 'Select a template:', input: '\r' },
      ],
      cliPath,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('A sample layout described by the manifest');
    expect(stdout.indexOf('Sample fixture')).toBeLessThan(stdout.indexOf('Minimal fixture'));
    expect(fs.readFileSync(path.join(destination, 'src/app/app.routes.tsx'), 'utf-8')).toBe(
      fixtureRoutes,
    );
    expect(fs.existsSync(path.join(destination, 'src/app/layouts'))).toBe(false);
  });

  test('derives the CLI template ID for a layout declared only in the manifest', () => {
    const { cliPath, templateDir } = createCliFixture();
    createTemplateFixture(templateDir);
    const config = createScaffoldFixture();
    config.layouts = [
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'A custom fixture layout',
        scaffold: { dependencies: [] },
      },
    ];
    fs.writeFileSync(path.join(templateDir, 'scaffold.json'), JSON.stringify(config));
    fs.mkdirSync(path.join(templateDir, 'src/app/layouts/minimal'));
    fs.writeFileSync(path.join(templateDir, 'src/app/layouts/minimal/routes.tsx'), fixtureRoutes);
    const destination = path.join(genPath(), 'generated');
    run(
      [destination, '--template', 'ix-react-minimal', '--no-interactive'],
      { cwd: genRoot },
      cliPath,
    );
    expect(fs.existsSync(path.join(destination, 'src/app/app.routes.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(destination, 'src/app/layouts'))).toBe(false);
    const help = run(['--help'], { cwd: genRoot }, cliPath);
    expect(help.stdout).toContain('ix-react-minimal');
    expect(help.stdout).not.toContain('ix-react-blank');
  });
});

test('fails without --overwrite when target directory is not empty', () => {
  createNonEmptyDir(genPath());
  const existingContents = snapshotDir(genPath());
  const result = run([projectName, '--no-interactive', '--template', 'ix-react-starter'], {
    cwd: genRoot,
    reject: false,
  });

  expect(result.exitCode).toBe(1);
  expect(result.stdout).toContain('is not empty. Rerun with --overwrite');
  expect(snapshotDir(genPath())).toEqual(existingContents);
});

test('rejects a file as the target path without changing it', () => {
  createNonEmptyDir(genPath());
  const filePath = path.join(genPath(), 'sentinel.txt');
  const existingContents = snapshotDir(genPath());
  const result = run(
    [filePath, '--overwrite', '--template', 'ix-react-starter', '--no-interactive'],
    { cwd: genRoot, reject: false },
  );

  expect(result.exitCode).toBe(1);
  expect(result.stdout).toContain(`Target path "${filePath}" is not a directory.`);
  expect(result.stdout).not.toContain('Scaffolding project');
  expect(snapshotDir(genPath())).toEqual(existingContents);
});

describe.each([false, true])('linked destinations (overwrite=%s)', overwrite => {
  const expectRejectedDestination = (destination: string) => {
    const existingContents = snapshotDir(genPath());
    const result = run(
      [
        destination,
        '--template',
        'ix-react-starter',
        '--no-interactive',
        ...(overwrite ? ['--overwrite'] : []),
      ],
      { cwd: genRoot, reject: false, timeout: 5000 },
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain(
      `Target path "${path.resolve(genRoot, destination)}" is a symbolic link or junction.`,
    );
    expect(result.stdout).not.toContain('Scaffolding project');
    expect(snapshotDir(genPath())).toEqual(existingContents);
  };

  test('rejects a linked non-empty destination without changing its contents', () => {
    const destination = path.join(genPath(), 'existing');
    const linkedPath = path.join(genPath(), 'linked');
    createNonEmptyDir(destination);
    fs.symlinkSync(destination, linkedPath, directoryLinkType);

    expectRejectedDestination(linkedPath);
  });

  test('rejects a linked empty destination', () => {
    const destination = path.join(genPath(), 'empty');
    const linkedPath = path.join(genPath(), 'linked');
    fs.mkdirSync(destination, { recursive: true });
    fs.symlinkSync(destination, linkedPath, directoryLinkType);

    expectRejectedDestination(`${linkedPath}${path.sep}`);
  });

  test('rejects a dangling destination link without replacing it', () => {
    createNonEmptyDir(genPath());
    const linkedPath = path.join(genPath(), 'linked');
    const missingPath = path.join(genPath(), 'missing');
    fs.symlinkSync(missingPath, linkedPath, directoryLinkType);

    expectRejectedDestination(linkedPath);
    expect(fs.existsSync(missingPath)).toBe(false);
  });

  test('rejects a looping destination link', () => {
    createNonEmptyDir(genPath());
    const linkedPath = path.join(genPath(), 'linked');
    fs.symlinkSync(linkedPath, linkedPath, directoryLinkType);

    expectRejectedDestination(linkedPath);
  });
});

describe('linked parent folders', () => {
  test('keeps the non-empty check for the real target folder', () => {
    const realParent = path.join(genPath(), 'real-parent');
    const linkedParent = path.join(genPath(), 'linked-parent');
    createNonEmptyDir(path.join(realParent, 'existing'));
    fs.symlinkSync(realParent, linkedParent, directoryLinkType);
    const existingContents = snapshotDir(genPath());
    const result = run(
      [path.join(linkedParent, 'existing'), '--template', 'ix-react-starter', '--no-interactive'],
      { cwd: genRoot, reject: false },
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('is not empty. Rerun with --overwrite');
    expect(snapshotDir(genPath())).toEqual(existingContents);
  });

  test('scaffolds into a new folder below a linked parent', () => {
    const realParent = path.join(genPath(), 'real-parent');
    const linkedParent = path.join(genPath(), 'linked-parent');
    fs.mkdirSync(realParent, { recursive: true });
    fs.symlinkSync(realParent, linkedParent, directoryLinkType);
    const destination = path.join(linkedParent, 'new', 'app');

    const { stdout } = run([destination, '--template', 'ix-react-starter', '--no-interactive'], {
      cwd: genRoot,
    });

    expect(stdout).toContain(`Scaffolding project in ${destination}`);
    expect(fs.lstatSync(linkedParent).isSymbolicLink()).toBe(true);
    expect(fs.existsSync(path.join(realParent, 'new', 'app', 'package.json'))).toBe(true);
  });
});

test('rejects a linked destination entered at the interactive prompt', () => {
  const destination = path.join(genPath(), 'existing');
  const linkedPath = path.join(genPath(), 'linked');
  createNonEmptyDir(destination);
  fs.symlinkSync(destination, linkedPath, directoryLinkType);
  const existingContents = snapshotDir(genPath());
  const result = run(
    ['--template', 'ix-react-starter', '--overwrite', '--interactive', '--no-immediate'],
    { cwd: genRoot, input: `${linkedPath}\r`, reject: false, timeout: 5000 },
  );

  expect(result.exitCode).toBe(1);
  expect(result.stdout).toContain('symbolic link or junction');
  expect(result.stdout).not.toContain('Scaffolding project');
  expect(snapshotDir(genPath())).toEqual(existingContents);
});

describe('validation before overwrite', () => {
  test('preserves existing contents when the template argument is invalid', () => {
    createNonEmptyDir(genPath());
    const existingContents = snapshotDir(genPath());
    const result = run([projectName, '--overwrite', '--template', 'unknown', '--no-interactive'], {
      cwd: genRoot,
      reject: false,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Unknown template "unknown"');
    expect(result.stdout).not.toContain('Scaffolding project');
    expect(snapshotDir(genPath())).toEqual(existingContents);
  });

  test.each(['missing template', 'invalid package.json'])(
    'preserves existing contents on %s',
    failure => {
      const destination = path.join(genPath(), 'existing');
      createNonEmptyDir(destination);
      const { cliPath, templateDir } = createCliFixture();
      if (failure !== 'missing template') {
        fs.mkdirSync(templateDir);
        fs.writeFileSync(
          path.join(templateDir, 'scaffold.json'),
          JSON.stringify(createScaffoldFixture()),
        );
        if (failure === 'invalid package.json') {
          fs.writeFileSync(path.join(templateDir, 'package.json'), '{ invalid JSON');
        }
      }
      const existingContents = snapshotDir(genPath());
      const result = run(
        [destination, '--overwrite', '--template', 'ix-react-starter', '--no-interactive'],
        { cwd: genRoot, reject: false },
        cliPath,
      );

      expect(result.exitCode).toBe(1);
      expect(failure === 'missing template' ? result.stderr : result.stdout).toContain(
        failure === 'missing template' ? 'not shipped with this version' : 'invalid package.json',
      );
      expect(result.stdout).not.toContain('Scaffolding project');
      expect(snapshotDir(genPath())).toEqual(existingContents);
    },
  );

  test.each([
    'invalid scaffold.json',
    'missing route entry',
    'missing dependency',
    'duplicate output path',
    'file and directory collision',
    'unreadable source file',
  ])('preserves existing contents on %s', failure => {
    const destination = path.join(genPath(), 'existing');
    createNonEmptyDir(destination);
    const { cliPath, templateDir } = createCliFixture();
    createTemplateFixture(templateDir);
    const configPath = path.join(templateDir, 'scaffold.json');
    if (failure === 'invalid scaffold.json') {
      fs.writeFileSync(configPath, '{ invalid JSON');
    } else if (failure === 'missing route entry') {
      fs.rmSync(path.join(templateDir, 'src/app/app.routes.tsx'));
    } else if (failure === 'missing dependency') {
      const config: ScaffoldConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.scaffold.dependencies = ['missing-package'];
      fs.writeFileSync(configPath, JSON.stringify(config));
    } else if (failure === 'duplicate output path') {
      fs.writeFileSync(
        path.join(templateDir, 'src/app/layouts/starter/app.routes.tsx'),
        'export const routes = [];\n',
      );
    } else if (failure === 'file and directory collision') {
      fs.writeFileSync(path.join(templateDir, 'src/app/pages'), 'Conflicting file\n');
      fs.mkdirSync(path.join(templateDir, 'src/app/layouts/starter/pages'));
      fs.writeFileSync(
        path.join(templateDir, 'src/app/layouts/starter/pages/home.tsx'),
        'export {};\n',
      );
    } else {
      fs.symlinkSync(
        path.join(templateDir, 'missing.txt'),
        path.join(templateDir, 'unreadable.txt'),
      );
    }
    const existingContents = snapshotDir(destination);
    const result = run(
      [destination, '--overwrite', '--template', 'ix-react-starter', '--no-interactive'],
      { cwd: genRoot, reject: false },
      cliPath,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).not.toContain('Scaffolding project');
    if (failure === 'duplicate output path') {
      expect(result.stderr).toContain('maps both');
    } else if (failure === 'file and directory collision') {
      expect(result.stderr).toContain('maps a file and a directory');
    }
    expect(snapshotDir(destination)).toEqual(existingContents);
  });

  test.each([
    {
      name: 'design system and framework',
      directory: 'existing',
      args: ['--no-immediate'],
      prompt: 'Select design system and framework:',
    },
    {
      name: 'package name',
      directory: 'Invalid Name',
      args: ['--template', 'ix-react-starter', '--no-immediate'],
      prompt: 'Package name:',
    },
    {
      name: 'installation',
      directory: 'existing',
      args: ['--template', 'ix-react-starter'],
      prompt: 'Install with',
    },
  ])(
    'preserves existing contents when the $name prompt is cancelled',
    ({ directory, args, prompt }) => {
      const destination = path.join(genPath(), directory);
      createNonEmptyDir(destination);
      const existingContents = snapshotDir(genPath());
      const result = run([destination, '--overwrite', '--interactive', ...args], {
        cwd: genRoot,
        input: '\x03',
        reject: false,
        timeout: 5000,
      });

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain(prompt);
      expect(result.stdout).toContain('Operation cancelled');
      expect(result.stdout).not.toContain('Scaffolding project');
      expect(snapshotDir(genPath())).toEqual(existingContents);
    },
  );

  test('preserves existing contents when the template prompt is cancelled', async () => {
    createNonEmptyDir(genPath());
    const existingContents = snapshotDir(genPath());
    const result = await runInteractive(
      [projectName, '--overwrite', '--interactive', '--no-immediate'],
      [
        { prompt: 'Select design system and framework:', input: '\r' },
        { prompt: 'Select a template:', input: '\x03' },
      ],
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Operation cancelled');
    expect(result.stdout).not.toContain('Scaffolding project');
    expect(snapshotDir(genPath())).toEqual(existingContents);
  });

  test('preserves existing contents when the project name prompt is cancelled', () => {
    createNonEmptyDir(genPath());
    const existingContents = snapshotDir(genRoot);
    const result = run(['--overwrite', '--interactive'], {
      cwd: genRoot,
      input: '\x03',
      reject: false,
      timeout: 5000,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Project name:');
    expect(result.stdout).toContain('Operation cancelled');
    expect(result.stdout).not.toContain('Scaffolding project');
    expect(snapshotDir(genRoot)).toEqual(existingContents);
  });

  test('rechecks the target for links after prompting and before deletion', async () => {
    const destination = path.join(genPath(), 'existing');
    const protectedDir = path.join(genPath(), 'protected');
    createNonEmptyDir(destination);
    createNonEmptyDir(protectedDir);
    let existingContents: DirectorySnapshot | undefined;
    const result = await runInteractive(
      [destination, '--overwrite', '--template', 'ix-react-starter', '--interactive'],
      [
        {
          prompt: 'Install with',
          input: 'n\r',
          beforeInput: () => {
            fs.renameSync(destination, path.join(genPath(), 'original'));
            fs.symlinkSync(protectedDir, destination, directoryLinkType);
            existingContents = snapshotDir(genPath());
          },
        },
      ],
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('symbolic link or junction');
    expect(result.stdout).not.toContain('Scaffolding project');
    expect(existingContents).toBeDefined();
    expect(snapshotDir(genPath())).toEqual(existingContents);
  });

  test('rechecks the non-empty-directory guard after prompting', async () => {
    const destination = path.join(genPath(), 'existing');
    fs.mkdirSync(destination, { recursive: true });
    let existingContents: DirectorySnapshot | undefined;
    const result = await runInteractive(
      [destination, '--template', 'ix-react-starter', '--interactive'],
      [
        {
          prompt: 'Install with',
          input: 'n\r',
          beforeInput: () => {
            createNonEmptyDir(destination);
            existingContents = snapshotDir(genPath());
          },
        },
      ],
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('is not empty. Rerun with --overwrite');
    expect(result.stdout).not.toContain('Scaffolding project');
    expect(existingContents).toBeDefined();
    expect(snapshotDir(genPath())).toEqual(existingContents);
  });

  test('preserves existing contents when template traversal fails', async () => {
    const destination = path.join(genPath(), 'existing');
    createNonEmptyDir(destination);
    const existingContents = snapshotDir(destination);
    const { cliPath, templateDir } = createCliFixture();
    fs.mkdirSync(templateDir);
    fs.writeFileSync(path.join(templateDir, 'package.json'), '{ "scripts": { "dev": "vite" } }');
    fs.writeFileSync(
      path.join(templateDir, 'scaffold.json'),
      JSON.stringify(createScaffoldFixture()),
    );
    const result = await runInteractive(
      [destination, '--overwrite', '--template', 'ix-react-starter', '--interactive'],
      [
        {
          prompt: 'Install with',
          input: 'n\r',
          beforeInput: () => {
            fs.renameSync(templateDir, `${templateDir}-original`);
            fs.writeFileSync(templateDir, 'Not a directory.\n');
          },
        },
      ],
      cliPath,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('ENOTDIR');
    expect(result.stdout).not.toContain('Scaffolding project');
    expect(snapshotDir(destination)).toEqual(existingContents);
  });
});

test('overwrites a directory without following child links or deleting .git', () => {
  const destination = path.join(genPath(), 'existing');
  const protectedDir = path.join(genPath(), 'protected');
  createNonEmptyDir(destination);
  createNonEmptyDir(protectedDir);
  fs.symlinkSync(protectedDir, path.join(destination, 'src'), directoryLinkType);
  const gitDir = path.join(destination, '.git');
  fs.mkdirSync(gitDir);
  fs.writeFileSync(path.join(gitDir, 'sentinel.txt'), 'Keep repository metadata.\n');
  const protectedContents = snapshotDir(protectedDir);
  const gitContents = snapshotDir(gitDir);

  const { stdout } = run(
    [destination, '--overwrite', '--template', 'ix-react-starter', '--no-interactive'],
    { cwd: genRoot },
  );

  expect(stdout).toContain(`Scaffolding project in ${destination}`);
  expect(fs.lstatSync(path.join(destination, 'src')).isDirectory()).toBe(true);
  expect(fs.readFileSync(path.join(destination, 'package.json'), 'utf-8')).toContain(
    '@siemens/ix-react',
  );
  expect(fs.existsSync(path.join(destination, 'sentinel.txt'))).toBe(false);
  expect(fs.existsSync(path.join(destination, 'nested'))).toBe(false);
  expect(snapshotDir(protectedDir)).toEqual(protectedContents);
  expect(snapshotDir(gitDir)).toEqual(gitContents);
});

test('scaffolds an absolute destination path', () => {
  const absDir = path.join(fs.realpathSync(os.tmpdir()), `create-siemens-web-abs-${Date.now()}`);
  const { stdout } = run([absDir, '--template', 'ix-react-starter', '--no-interactive']);

  expect(stdout).toContain(`Scaffolding project in ${absDir}`);
  const generatedPkg = fs.readFileSync(path.join(absDir, 'package.json'), 'utf-8');
  expect(generatedPkg).toContain('@siemens/ix-react');
  fs.rmSync(absDir, { recursive: true, force: true });
});

test('scaffolds a relative destination path with native separators', () => {
  const relativeDir = path.sep === '\\' ? '.\\relative app' : './relative app';
  const destination = path.join(genRoot, 'relative app');
  const { stdout } = run([relativeDir, '--template', 'ix-react-starter', '--no-interactive'], {
    cwd: genRoot,
  });

  expect(stdout).toContain(`Scaffolding project in ${destination}`);
  expect(fs.existsSync(path.join(destination, 'package.json'))).toBe(true);
  fs.rmSync(destination, { recursive: true, force: true });
});

test('preserves spaces in destination paths and sanitizes only the package name', () => {
  const destination = path.join(genRoot, 'project with spaces');
  const { stdout } = run([destination, '--template', 'ix-react-starter', '--no-interactive']);

  expect(stdout).toContain(`Scaffolding project in ${destination}`);
  const generatedPkg = JSON.parse(fs.readFileSync(path.join(destination, 'package.json'), 'utf-8'));
  expect(generatedPkg.name).toBe('project-with-spaces');
  fs.rmSync(destination, { recursive: true, force: true });
});

test('refuses an explicitly supplied filesystem root instead of using the default destination', () => {
  const filesystemRoot = path.parse(genRoot).root;

  expect(() => run([filesystemRoot, '--no-interactive'], { cwd: genRoot })).toThrow(
    /Refusing to scaffold into the filesystem root/,
  );
  expect(fs.existsSync(path.join(genRoot, 'siemens-web-app'))).toBe(false);
});

describe('UNC destinations', () => {
  test.each([
    '\\\\server.invalid\\share\\',
    '\\\\server.invalid\\share\\my-app',
    '//server.invalid/share/my-app',
    '\\\\?\\UNC\\server.invalid\\share\\',
    '\\\\?\\UNC\\server.invalid\\share\\my-app',
    '\\\\?\\unc\\server.invalid\\share\\my-app',
    '//?/UNC/server.invalid/share/my-app',
    '\\\\.\\UNC\\server.invalid\\share\\my-app',
    '\\/server.invalid\\share\\my-app',
    '/\\server.invalid/share/my-app',
  ])('rejects %s before scaffolding, even with --overwrite', destination => {
    const existingFiles = fs.readdirSync(genRoot);
    const result = run(
      [destination, '--template', 'ix-react-starter', '--overwrite', '--no-interactive'],
      { cwd: genRoot, reject: false, timeout: 5000 },
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('UNC paths are not supported.');
    expect(result.stdout).not.toContain('Scaffolding project');
    expect(fs.readdirSync(genRoot)).toEqual(existingFiles);
  });

  test('rejects a UNC destination entered at the interactive prompt', () => {
    const existingFiles = fs.readdirSync(genRoot);
    const result = run(
      ['--template', 'ix-react-starter', '--overwrite', '--interactive', '--no-immediate'],
      {
        cwd: genRoot,
        input: '\\\\?\\UNC\\server.invalid\\share\\my-app\r',
        reject: false,
        timeout: 5000,
      },
    );

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('UNC paths are not supported.');
    expect(result.stdout).not.toContain('Scaffolding project');
    expect(fs.readdirSync(genRoot)).toEqual(existingFiles);
  });
});

describe('default template', () => {
  test('non-interactive run without --template uses ix-angular-starter', () => {
    const { stdout } = run([projectName, '--no-interactive'], { cwd: genRoot });
    expect(stdout).toContain(`Scaffolding project in ${genPath()}`);
    const pkgJson = fs.readFileSync(path.join(genPath(), 'package.json'), 'utf-8');
    expect(pkgJson).toContain('@siemens/ix-angular');
    expect(pkgJson).not.toContain('@siemens/element-ng');
  });
});

test.each(templateSelections)(
  '$template creates the selected project without prompts',
  ({ name, template, layout, dependency, script }) => {
    const { stdout } = run([projectName, '--template', template, '--no-interactive'], {
      cwd: genRoot,
      env: { ...process.env, _TEST_CLI: 'true', npm_config_user_agent: 'pnpm/12.0.0' },
    });
    const pkg: TemplatePackage = JSON.parse(
      fs.readFileSync(path.join(genPath(), 'package.json'), 'utf-8'),
    );
    expect(pkg.name).toBe(projectName);
    expect(pkg.dependencies).toHaveProperty(dependency);
    expect(pkg.scripts).toHaveProperty(script);
    expect(stdout).toContain('Done. Now run:');
    expect(stdout).toContain('pnpm install');
    expect(stdout).toContain(`pnpm ${script}`);
    expect(stdout).not.toMatch(
      /Project name:|Select design system|Select a template:|Installing dependencies/,
    );
    const indexPath = ['element', 'ix-angular'].includes(name) ? 'src/index.html' : 'index.html';
    expect(fs.readFileSync(path.join(genPath(), indexPath), 'utf-8')).toContain(
      `<title>${projectName}</title>`,
    );
    expect(fs.existsSync(path.join(genPath(), '.gitignore'))).toBe(true);
    expect(fs.existsSync(path.join(genPath(), 'scaffold.json'))).toBe(false);

    const sourceFiles = fs.readdirSync(path.join(genPath(), 'src'), {
      recursive: true,
      encoding: 'utf-8',
    });
    for (const page of ['get-started', 'forms', 'charts', 'grids']) {
      expect(
        sourceFiles.some(file => file.split(path.sep).includes(page)),
        page,
      ).toBe(layout !== 'blank');
    }
    const demoDependencies = Object.keys(pkg.dependencies ?? {}).some(value =>
      /echarts|ag-?grid|charts-ng|ngx-datatable|flag-icons|google-libphonenumber/.test(value),
    );
    expect(demoDependencies).toBe(layout !== 'blank');
    const layoutsRoot = path.join(genPath(), 'src/app/layouts');
    if (layout === 'overview') {
      expect(fs.readdirSync(layoutsRoot).sort()).toEqual(['blank', 'overview', 'starter']);
    } else {
      expect(fs.existsSync(layoutsRoot)).toBe(false);
      expect(fs.existsSync(path.join(genPath(), 'src/app/pages'))).toBe(true);
      const extension = name === 'ix-react' ? 'tsx' : 'ts';
      const entry = fs.readFileSync(
        path.join(genPath(), `src/app/app.routes.${extension}`),
        'utf-8',
      );
      const defaultPath = name === 'element' ? 'main' : name === 'ix-angular' ? '' : '/';
      expect(entry).toContain('export const route:');
      expect(entry).toContain(`path: '${defaultPath}',`);
      expect(entry).toContain('export const routes:');
      expect(entry).toContain(' = [route');
      expect(fs.existsSync(path.join(genPath(), `src/app/routes.${extension}`))).toBe(false);
    }
    if (layout === 'blank') {
      expect(sourceFiles.some(file => file.split(path.sep).includes('home'))).toBe(true);
    }
    expectProjectReferencesToResolve(genPath());

    if (name === 'element' || name === 'ix-angular') {
      const workspace = JSON.parse(fs.readFileSync(path.join(genPath(), 'angular.json'), 'utf-8'));
      expect(Object.keys(workspace.projects)).toEqual([template]);
      const { build, serve } = workspace.projects[template].architect;
      expect(serve.configurations.production.buildTarget).toBe(`${template}:build:production`);
      expect(serve.configurations.development.buildTarget).toBe(`${template}:build:development`);
      if (name === 'element') {
        expect(stdout).toContain('requires access to the Siemens GitLab npm registry');
        expect(fs.readFileSync(path.join(genPath(), '.npmrc'), 'utf-8')).toContain(
          '@simpl:registry=https://code.siemens.com/api/v4/projects/732/packages/npm/',
        );
        expect(build.options.styles).toEqual(['src/styles.scss']);
        const styles = fs.readFileSync(path.join(genPath(), 'src/styles.scss'), 'utf-8');
        const assetDirectory =
          layout === 'overview' ? 'src/app/layouts/starter/assets' : 'public/assets';
        for (const language of ['en', 'de']) {
          const sourceLayout = layout === 'overview' ? 'starter' : layout;
          expect(
            fs.readFileSync(path.join(genPath(), `${assetDirectory}/i18n/${language}.json`)),
          ).toEqual(
            fs.readFileSync(
              path.join(
                CLI_PATH,
                `template-element/src/app/layouts/${sourceLayout}/assets/i18n/${language}.json`,
              ),
            ),
          );
        }
        if (layout !== 'overview') {
          expect(build.options.assets).toContainEqual({ glob: '**/*', input: 'public' });
          expect(fs.existsSync(path.join(genPath(), 'src/app/styles.scss'))).toBe(false);
          expect(styles.includes('flag-icons/sass/flag-icons')).toBe(layout === 'starter');
        }
        expect(build.options.assets).toContain('src/favicon.ico');
        expect(build.options.assets).toContainEqual({
          glob: '**/*',
          input: 'node_modules/@siemens/element-ng/assets/images',
          output: './assets/images/',
        });
        expect(pkg.scripts?.['start:prod']).toContain(`dist/${template}/browser`);
      }
    }
  },
);

describe('template source isolation', () => {
  test('scaffolding different layouts does not modify the source template', () => {
    const source = path.join(CLI_PATH, 'template-element');
    const original = snapshotDir(source);
    for (const { template } of templateSelections.filter(
      selection => selection.name === 'element',
    )) {
      run([path.join(genPath(), template), '--template', template, '--no-interactive']);
    }
    expect(snapshotDir(source)).toEqual(original);
  });

  test('does not scaffold source-app metadata, lockfiles, or build artifacts', () => {
    const { cliPath, templateDir } = createCliFixture();
    createTemplateFixture(templateDir);
    for (const directory of ['node_modules', 'dist', '.angular', 'coverage', '.git']) {
      fs.mkdirSync(path.join(templateDir, directory));
      fs.writeFileSync(path.join(templateDir, directory, 'sentinel.txt'), 'Source artifact');
    }
    for (const file of [
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      'bun.lock',
      'pnpm-workspace.yaml',
    ]) {
      fs.writeFileSync(path.join(templateDir, file), 'Source metadata');
    }
    const destination = path.join(genPath(), 'generated');
    run(
      [destination, '--template', 'ix-react-starter', '--no-interactive'],
      { cwd: genRoot },
      cliPath,
    );

    for (const directory of ['node_modules', 'dist', '.angular', 'coverage', '.git']) {
      expect(fs.existsSync(path.join(destination, directory))).toBe(false);
    }
    for (const file of [
      'scaffold.json',
      'pnpm-lock.yaml',
      'package-lock.json',
      'yarn.lock',
      'bun.lock',
    ]) {
      expect(fs.existsSync(path.join(destination, file))).toBe(false);
    }
    expect(fs.readFileSync(path.join(destination, 'pnpm-workspace.yaml'), 'utf-8')).toContain(
      'allowBuilds:',
    );
  });
});

test.each(['--help', '-h'])('%s explains usage and lists available templates', flag => {
  const { stdout } = run([flag], {
    cwd: genRoot,
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  const message = 'Usage: create-siemens-web [OPTION]... [DIRECTORY]';
  expect(stdout).toContain(message);
  expect(stdout).toContain('-i, --immediate / --no-immediate');
  expect(stdout).toContain('--overwrite');
  expect(stdout).toContain('-h, --help');
  expect(stdout).toContain('UNC paths are not supported.');
  expect(stdout).toContain('DIRECTORY itself cannot be a symbolic link or junction.');
  expect(stdout).toContain('Element Angular (requires Siemens GitLab npm access)');
  for (const { display } of designSystems) {
    expect(stdout).toContain(display);
  }
  for (const { template } of templateSelections) {
    expect(stdout).toContain(`  - ${template}`);
  }
  expect(stdout).not.toContain('\u001b[');
});

test('writes pnpm workspace build approvals', () => {
  run([projectName, '--template', 'ix-react-starter', '--no-interactive'], {
    cwd: genRoot,
    env: {
      ...process.env,
      _TEST_CLI: 'true',
      npm_config_user_agent: 'pnpm/12.0.0 npm/? node/v22.21.0 darwin arm64',
    },
  });

  const approvals = fs.readFileSync(path.join(genPath(), 'pnpm-workspace.yaml'), 'utf-8');
  expect(approvals).toContain('allowBuilds:');
  for (const dependency of ['@parcel/watcher', 'esbuild', 'lmdb', 'msgpackr-extract']) {
    expect(approvals).toMatch(new RegExp(`["']?${dependency}["']?:\\s*true`));
  }
});

describe('installation and startup', () => {
  test.each([
    { manager: 'npm', script: 'dev', installArgs: ['install'], startArgs: ['run', 'dev'] },
    { manager: 'pnpm', script: 'start', installArgs: ['install'], startArgs: ['start'] },
    { manager: 'yarn', script: 'dev', installArgs: [], startArgs: ['dev'] },
    { manager: 'deno', script: 'dev', installArgs: ['install'], startArgs: ['task', 'dev'] },
  ])(
    '--immediate installs then starts with $manager in the generated project',
    ({ manager, script, installArgs, startArgs }) => {
      const { cliPath, templateDir } = createCliFixture();
      createTemplateFixture(templateDir);
      fs.writeFileSync(
        path.join(templateDir, 'package.json'),
        JSON.stringify({ scripts: { [script]: 'not-executed' }, dependencies: {} }),
      );
      const fixture = createPackageManagerFixture(manager);
      const destination = path.join(genPath(), 'generated');
      const result = run(
        [destination, '--template', 'ix-react-starter', '--immediate', '--no-interactive'],
        { cwd: genRoot, env: fixture.env },
        cliPath,
      );
      expect(result.exitCode).toBe(0);
      expect(fixture.calls()).toEqual([
        { manager, args: installArgs, cwd: destination, projectName: 'generated' },
        { manager, args: startArgs, cwd: destination, projectName: 'generated' },
      ]);
    },
  );

  test.each([true, false])(
    'confirmation installs and starts only when accepted (%s)',
    async accepted => {
      const { cliPath, templateDir } = createCliFixture();
      createTemplateFixture(templateDir);
      const fixture = createPackageManagerFixture('npm');
      const destination = path.join(genPath(), 'generated');
      const result = await runInteractive(
        [destination, '--template', 'ix-react-starter', '--interactive'],
        [{ prompt: 'Install with npm and start now?', input: accepted ? 'y\r' : 'n\r' }],
        cliPath,
        fixture.env,
      );
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(destination, 'package.json'))).toBe(true);
      if (accepted) {
        expect(fixture.calls()).toEqual([
          { manager: 'npm', args: ['install'], cwd: destination, projectName: 'generated' },
          { manager: 'npm', args: ['run', 'dev'], cwd: destination, projectName: 'generated' },
        ]);
      } else {
        expect(fs.existsSync(fixture.log)).toBe(false);
        expect(result.stdout).toContain('Done. Now run:');
      }
    },
  );

  test('--no-immediate skips installation and selection prompts with an explicit template', () => {
    const { cliPath, templateDir } = createCliFixture();
    createTemplateFixture(templateDir);
    const fixture = createPackageManagerFixture('npm');
    const destination = path.join(genPath(), 'generated');
    const result = run(
      [destination, '--template', 'ix-react-starter', '--interactive', '--no-immediate'],
      { cwd: genRoot, env: fixture.env },
      cliPath,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).not.toMatch(/Select design system|Select a template:|Install with/);
    expect(fs.existsSync(fixture.log)).toBe(false);
    expect(fs.existsSync(path.join(destination, 'package.json'))).toBe(true);
  });

  test('failed installation stops before startup and leaves the generated project available', () => {
    const { cliPath, templateDir } = createCliFixture();
    createTemplateFixture(templateDir);
    const fixture = createPackageManagerFixture('npm', 17);
    const destination = path.join(genPath(), 'generated');
    const result = run(
      [destination, '--template', 'ix-react-starter', '--immediate', '--no-interactive'],
      { cwd: genRoot, env: fixture.env, reject: false },
      cliPath,
    );
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('exited with code 17');
    expect(fixture.calls()).toEqual([
      { manager: 'npm', args: ['install'], cwd: destination, projectName: 'generated' },
    ]);
    expect(fs.existsSync(path.join(destination, 'src/app/app.routes.tsx'))).toBe(true);
  });
});
