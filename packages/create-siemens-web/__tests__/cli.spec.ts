/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SyncOptions } from 'execa';
import { execa, execaSync } from 'execa';
import { afterEach, beforeAll, describe, expect, test } from 'vitest';

const CLI_PATH = path.join(import.meta.dirname, '..');

const projectName = 'test-app';
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
) => {
  const subprocess = execa(process.execPath, [cliPath, ...args], {
    cwd: genRoot,
    env: { ...process.env, _TEST_CLI: 'true' },
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
  return { cliPath, templateDir: path.join(cliDir, 'template-ix-react-starter') };
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

test('prompts for the project name if none supplied', () => {
  const { stdout } = run(['--interactive']);
  expect(stdout).toContain('Project name:');
});

test('prompts for the framework if none supplied', () => {
  const { stdout } = run([projectName, '--interactive']);
  expect(stdout).toContain('Select a framework:');
});

test('prompts for the framework on supplying an invalid template', () => {
  const { stdout } = run([projectName, '--interactive', '--template', 'unknown']);
  expect(stdout).toContain('"unknown" isn\'t a valid template. Please choose from below:');
});

test('fails on a non-interactive run with an unknown template', () => {
  expect(() => run([projectName, '--no-interactive', '--template', 'unknown'])).toThrow();
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

  test.each(['missing template', 'missing package.json', 'invalid package.json'])(
    'preserves existing contents on %s',
    failure => {
      const destination = path.join(genPath(), 'existing');
      createNonEmptyDir(destination);
      const { cliPath, templateDir } = createCliFixture();
      if (failure !== 'missing template') {
        fs.mkdirSync(templateDir);
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
      expect(result.stdout).toContain(
        failure === 'missing template' ? 'not shipped with this version' : 'invalid package.json',
      );
      expect(result.stdout).not.toContain('Scaffolding project');
      expect(snapshotDir(genPath())).toEqual(existingContents);
    },
  );

  test.each([
    {
      name: 'framework',
      directory: 'existing',
      args: ['--no-immediate'],
      prompt: 'Select a framework:',
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

  test('preserves existing contents when the variant prompt is cancelled', async () => {
    createNonEmptyDir(genPath());
    const existingContents = snapshotDir(genPath());
    const result = await runInteractive(
      [projectName, '--overwrite', '--interactive', '--no-immediate'],
      [
        { prompt: 'Select a framework:', input: '\r' },
        { prompt: 'Select a variant:', input: '\x03' },
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

test('fails in interactive mode without --overwrite when target is not empty', () => {
  createNonEmptyDir(path.join(genRoot, projectName));
  const existingContents = snapshotDir(genPath());

  expect(() =>
    run([projectName, '--interactive', '--template', 'ix-react-starter'], { cwd: genRoot }),
  ).toThrow(/is not empty\. Rerun with --overwrite/);
  expect(snapshotDir(genPath())).toEqual(existingContents);
});

test('overwrites non-empty target directory with --overwrite', () => {
  createNonEmptyDir(path.join(genRoot, projectName));

  const { stdout } = run(
    [projectName, '--overwrite', '--template', 'ix-react-starter', '--no-interactive'],
    { cwd: genRoot },
  );
  expect(stdout).toContain(`Scaffolding project in ${genPath()}`);
  const generatedPkg = fs.readFileSync(path.join(genPath(), 'package.json'), 'utf-8');
  expect(generatedPkg).toContain('@siemens/ix-react');
  expect(generatedPkg).not.toContain('{ "foo": "bar" }');
  expect(fs.existsSync(path.join(genPath(), 'sentinel.txt'))).toBe(false);
  expect(fs.existsSync(path.join(genPath(), 'nested'))).toBe(false);
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

describe('template startups', () => {
  const templates = [
    { template: 'element-starter', script: 'start' },
    { template: 'ix-angular-starter', script: 'start' },
    { template: 'ix-react-starter', script: 'dev' },
    { template: 'ix-vue-starter', script: 'dev' },
  ];

  test.each(templates)(
    '$template prints run command for "$script" script',
    ({ template, script }) => {
      const { stdout } = run([projectName, '--template', template, '--no-interactive'], {
        cwd: genRoot,
      });
      expect(stdout).toContain(`Scaffolding project in ${genPath()}`);
      expect(stdout).toContain(`pnpm ${script}`);
    },
  );
});

test('uses element-starter run script start on immediate', () => {
  const { stdout } = run(
    [projectName, '--template', 'element-starter', '--immediate', '--no-interactive'],
    { cwd: genRoot },
  );
  expect(stdout).toContain('Starting "start"');
});

test('sets index.html title to project name', () => {
  const { stdout } = run([projectName, '--template', 'ix-react-starter', '--no-interactive'], {
    cwd: genRoot,
  });

  const indexHtmlContent = fs.readFileSync(path.join(genPath(), 'index.html'), 'utf-8');
  expect(stdout).toContain(`Scaffolding project in ${genPath()}`);
  expect(indexHtmlContent).toContain(`<title>${projectName}</title>`);
});

test('warns about Siemens registry access for element-starter', () => {
  const { stdout } = run([projectName, '--template', 'element-starter', '--no-interactive'], {
    cwd: genRoot,
  });
  expect(stdout).toContain('requires access to the Siemens GitLab npm registry');
});

test('return help usage how to use create-siemens-web', () => {
  const { stdout } = run(['--help'], { cwd: genRoot });
  const message = 'Usage: create-siemens-web [OPTION]... [DIRECTORY]';
  expect(stdout).toContain(message);
  expect(stdout).toContain('-i, --immediate / --no-immediate');
  expect(stdout).toContain('--overwrite');
  expect(stdout).toContain('-h, --help');
  expect(stdout).toContain('UNC paths are not supported.');
  expect(stdout).toContain('DIRECTORY itself cannot be a symbolic link or junction.');
});

test('return help usage how to use create-siemens-web with -h alias', () => {
  const { stdout } = run(['-h'], { cwd: genRoot });
  const message = 'Usage: create-siemens-web [OPTION]... [DIRECTORY]';
  expect(stdout).toContain(message);
});

test('skip prompts when --no-interactive is passed', () => {
  const { stdout } = run([projectName, '--no-interactive', '--template', 'ix-react-starter'], {
    cwd: genRoot,
  });
  expect(stdout).not.toContain('Project name:');
  expect(stdout).toContain('Done. Now run:');
});

test('accepts immediate flag', () => {
  const { stdout } = run(
    [projectName, '--template', 'ix-react-starter', '--immediate', '--no-interactive'],
    { cwd: genRoot },
  );
  expect(stdout).not.toContain('Install with');
  expect(stdout).toContain(`Scaffolding project in ${genPath()}`);
  expect(stdout).toContain('Installing dependencies');
  expect(stdout).toContain('Starting "dev"');
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

  expect(fs.readFileSync(path.join(genPath(), 'pnpm-workspace.yaml'), 'utf-8')).toBe(
    `allowBuilds:
  '@parcel/watcher': true
  esbuild: true
  lmdb: true
  msgpackr-extract: true
`,
  );
});

test('accepts --no-immediate flag and skips install prompt', () => {
  const { stdout } = run(
    [projectName, '--template', 'ix-vue-starter', '--no-immediate', '--no-interactive'],
    { cwd: genRoot },
  );
  expect(stdout).not.toContain('Install with');
  expect(stdout).not.toContain('Installing dependencies');
  expect(stdout).toContain(`Scaffolding project in ${genPath()}`);
});
