/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { prepareTemplateFiles, readScaffoldConfig, type ScaffoldConfig } from '../src/template';

const config: ScaffoldConfig = {
  id: 'fixture',
  name: 'Fixture',
  layouts: [
    {
      id: 'blank',
      name: 'Blank',
      description: 'A blank fixture',
      scaffold: { dependencies: [] },
    },
    {
      id: 'starter',
      name: 'Starter',
      description: 'A starter fixture',
      scaffold: { dependencies: [] },
    },
    {
      id: 'overview',
      name: 'Overview',
      description: 'An overview fixture',
      scaffold: { includeLayouts: ['blank', 'starter'], preserveHierarchy: true },
    },
  ],
  scaffold: { routesFile: 'src/app/app.routes.ts', dependencies: [] },
};
const header = '// Copyright (c) Siemens 2026\n// SPDX-License-Identifier: MIT\n\n';
let templateDir: string;

const writeFile = (file: string, content: string | Buffer) => {
  const target = path.join(templateDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

const prepare = (layout = 'starter', scaffoldConfig = config) => {
  return new Map(
    prepareTemplateFiles({
      templateDir,
      layout,
      packageName: 'test-app',
      templatePackage: { dependencies: {} },
      config: scaffoldConfig,
    }).map(file => [file.relativePath.split(path.sep).join('/'), file.content]),
  );
};

const angularConfig = () => {
  const layoutAssets = {
    blank: [{ glob: '**/*', input: 'src/app/layouts/blank/assets', output: 'assets' }],
    starter: [{ glob: '**/*', input: 'src/app/layouts/starter/assets', output: 'assets' }],
  };
  writeFile(
    'angular.json',
    JSON.stringify({
      projects: {
        'fixture-overview': {
          architect: {
            build: {
              options: {
                assets: [...layoutAssets.starter, 'src/favicon.ico'],
                styles: ['src/styles.scss'],
              },
            },
          },
        },
      },
    }),
  );
  writeFile(
    'src/styles.scss',
    header +
      "@use './styles/theme';\n@use './app/layouts/starter/styles';\n\n@include theme.styles;\n",
  );
  writeFile('src/styles/_theme.scss', '@mixin styles {}\n');
  writeFile(
    'src/app/layouts/starter/styles.scss',
    header + "@use 'flag-icons/sass/flag-icons' with (\n  $flag-icons-use-square: false\n);\n",
  );
  return {
    ...config,
    layouts: config.layouts.map(layout => {
      if (layout.id !== 'blank' && layout.id !== 'starter') {
        return layout;
      }
      return {
        ...layout,
        scaffold: { ...layout.scaffold, angular: { assets: layoutAssets[layout.id] } },
      };
    }),
    scaffold: { ...config.scaffold, angular: { defaultRoute: 'main' } },
  };
};

beforeEach(() => {
  templateDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'template-extraction-'));
  writeFile('package.json', '{"dependencies":{}}\n');
  writeFile('scaffold.json', JSON.stringify(config));
  writeFile('src/app/app.routes.ts', 'export const routes = [];\n');
  writeFile('src/app/layouts/blank/routes.ts', 'export const createRoutes = () => [];\n');
  writeFile('src/app/layouts/starter/routes.ts', 'export const createRoutes = () => [];\n');
});

afterEach(() => {
  fs.rmSync(templateDir, { recursive: true, force: true });
});

describe('manifest metadata', () => {
  test.each([
    {
      name: 'missing layout metadata',
      value: { ...config, layouts: [{ scaffold: { dependencies: [] } }] },
    },
    {
      name: 'invalid dependencies',
      value: { ...config, scaffold: { ...config.scaffold, dependencies: 1 } },
    },
    {
      name: 'invalid registry requirement',
      value: { ...config, requiresSiemensRegistry: 'true' },
    },
    {
      name: 'unsafe layout ID',
      value: {
        ...config,
        layouts: config.layouts.map(layout => ({ ...layout, id: '../outside' })),
      },
    },
  ])('rejects $name', ({ value }) => {
    writeFile('scaffold.json', JSON.stringify(value));
    expect(() => readScaffoldConfig(templateDir)).toThrow('invalid scaffold.json');
  });

  test('rejects duplicate layout identifiers', () => {
    writeFile(
      'scaffold.json',
      JSON.stringify({
        ...config,
        layouts: config.layouts.map(layout => ({ ...layout, id: 'blank' })),
      }),
    );
    expect(() => readScaffoldConfig(templateDir)).toThrow('duplicate layout ID');
  });

  test('rejects missing layout references', () => {
    const invalid: ScaffoldConfig = {
      ...config,
      layouts: [
        {
          ...config.layouts[2],
          scaffold: { includeLayouts: ['missing'], preserveHierarchy: true },
        },
      ],
    };
    writeFile('scaffold.json', JSON.stringify(invalid));
    expect(() => readScaffoldConfig(templateDir)).toThrow('unknown layout');
    expect(() => prepare('overview', invalid)).toThrow('unknown layout');
  });

  test('rejects circular layout composition', () => {
    const circular: ScaffoldConfig = {
      ...config,
      layouts: config.layouts.map(layout => ({
        ...layout,
        scaffold: { includeLayouts: [layout.id], preserveHierarchy: true },
      })),
    };
    expect(() => prepare('overview', circular)).toThrow('circular layout reference');
  });
});

describe('declared layout composition', () => {
  test('preserves hierarchy based on settings rather than the layout name', () => {
    const gallery: ScaffoldConfig = {
      ...config,
      layouts: config.layouts.map(layout =>
        layout.id === 'overview' ? { ...layout, id: 'gallery' } : layout,
      ),
    };
    writeFile('src/app/layouts/gallery/gallery.ts', 'export const gallery = {};\n');
    const files = prepare('gallery', gallery);
    expect(files.has('src/app/layouts/gallery/gallery.ts')).toBe(true);
    expect(files.has('src/app/layouts/blank/routes.ts')).toBe(true);
    expect(files.has('src/app/layouts/starter/routes.ts')).toBe(true);
    expect(files.get('src/app/app.routes.ts')).toEqual(Buffer.from('export const routes = [];\n'));
  });

  test('includes only the layouts declared by composition', () => {
    const overview: ScaffoldConfig = {
      ...config,
      layouts: config.layouts.map(layout =>
        layout.id === 'overview'
          ? { ...layout, scaffold: { includeLayouts: ['blank'], preserveHierarchy: true } }
          : layout,
      ),
    };
    const files = prepare('overview', overview);
    expect(files.has('src/app/layouts/blank/routes.ts')).toBe(true);
    expect(files.has('src/app/layouts/starter/routes.ts')).toBe(false);
  });

  test('combines shared, included and selected dependencies without unrelated layouts', () => {
    const composition: ScaffoldConfig = {
      ...config,
      scaffold: { ...config.scaffold, dependencies: ['shared'] },
      layouts: [
        { ...config.layouts[0], scaffold: { dependencies: ['blank'] } },
        { ...config.layouts[1], scaffold: { dependencies: ['starter'] } },
        {
          ...config.layouts[2],
          scaffold: {
            dependencies: ['gallery'],
            includeLayouts: ['blank'],
            preserveHierarchy: true,
          },
        },
      ],
    };
    const files = prepareTemplateFiles({
      templateDir,
      layout: 'overview',
      packageName: 'test-app',
      templatePackage: { dependencies: { shared: '1', blank: '1', starter: '1', gallery: '1' } },
      config: composition,
    });
    const pkg = JSON.parse(
      files.find(file => file.relativePath === 'package.json')!.content.toString(),
    );
    expect(pkg.dependencies).toEqual({ shared: '1', blank: '1', gallery: '1' });
  });
});

describe('standalone extraction', () => {
  test('merges layout-local and common shared files without changing local imports', () => {
    writeFile('src/app/shared/components/logo.ts', 'export const logo = {};\n');
    writeFile('src/app/layouts/starter/shared/data.ts', 'export const data = [];\n');
    writeFile('src/app/layouts/starter/shared/index.ts', "export * from './data';\n");
    const page = "import { data } from './../../shared';\n";
    writeFile('src/app/layouts/starter/pages/home/home.ts', page);

    const files = prepare();
    expect(files.has('src/app/shared/components/logo.ts')).toBe(true);
    expect(files.has('src/app/shared/data.ts')).toBe(true);
    expect(files.get('src/app/shared/index.ts')?.toString()).toBe("export * from './data';\n");
    expect(files.get('src/app/pages/home/home.ts')?.toString()).toBe(page);
    expect(files.get('src/app/app.routes.ts')?.toString()).toContain("from './routes'");
    expect([...files.keys()].some(file => file.includes('layouts/'))).toBe(false);
  });

  test('rebases module imports, exports, setup and component resources', () => {
    writeFile(
      'src/app/layouts/starter/components/feature.ts',
      [
        "import { common } from '../../../shared/common';",
        "export { common } from '../../../shared/common';",
        "import '../../../shared/setup';",
        "const lazy = () => import('../../../shared/lazy');",
        "const icon = new URL('../../../shared/icon.svg?raw#icon', import.meta.url);",
        "const component = { templateUrl: '../../../shared/template.html', styleUrl: '../../../shared/style.css', styleUrls: ['../../../shared/style.css'] };",
        "const loader = { prefix: './assets/i18n/' };",
      ].join('\n') + '\n',
    );
    writeFile(
      'src/app/layouts/starter/StarterLayout.vue',
      '<script setup lang="ts">\nimport Logo from \'../../shared/Logo.vue\';\n</script>\n<style scoped src="../../shared/style.css"></style>\n',
    );

    const files = prepare();
    const feature = files.get('src/app/components/feature.ts')?.toString();
    expect(feature).toContain("from '../shared/common'");
    expect(feature).toContain("import '../shared/setup'");
    expect(feature).toContain("import('../shared/lazy')");
    expect(feature).toContain("new URL('../shared/icon.svg?raw#icon'");
    expect(feature).toContain("templateUrl: '../shared/template.html'");
    expect(feature).toContain("styleUrl: '../shared/style.css'");
    expect(feature).toContain("styleUrls: ['../shared/style.css']");
    expect(feature).toContain("prefix: './assets/i18n/'");
    const vue = files.get('src/app/StarterLayout.vue')?.toString();
    expect(vue).toContain("from './shared/Logo.vue'");
    expect(vue).toContain('src="./shared/style.css"');
  });

  test('rebases references from common files to relocated layout files', () => {
    writeFile('src/main.ts', "import './app/layouts/starter/setup';\n");
    writeFile('src/app/shared/index.ts', "export * from '../layouts/starter/shared/data';\n");
    writeFile('src/app/layouts/starter/setup.ts', 'export {};\n');
    writeFile('src/app/layouts/starter/shared/data.ts', 'export const data = [];\n');

    const files = prepare();
    expect(files.get('src/main.ts')?.toString()).toBe("import './app/setup';\n");
    expect(files.get('src/app/shared/index.ts')?.toString()).toBe("export * from './data';\n");
  });

  test('preserves binary file contents', () => {
    const binary = Buffer.from([0, 255, 128, 13, 10, 0]);
    writeFile('src/app/layouts/starter/images/logo.png', binary);
    writeFile('src/favicon.ico', binary);

    const files = prepare();
    expect(files.get('src/app/images/logo.png')).toEqual(binary);
    expect(files.get('src/favicon.ico')).toEqual(binary);
  });

  test('rejects filenames that collide on case-insensitive filesystems', () => {
    writeFile('src/app/shared/logo.ts', 'export {};\n');
    writeFile('src/app/layouts/starter/shared/Logo.ts', 'export {};\n');
    expect(() => prepare()).toThrow('maps both');
  });
});

describe('global style composition', () => {
  test('inlines starter styles once and rebases their relative references', () => {
    const scaffoldConfig = angularConfig();
    writeFile('src/app/layouts/starter/partials/_colors.scss', '$color: red;\n');
    writeFile('src/app/layouts/starter/assets/flag.svg', '<svg></svg>\n');
    writeFile(
      'src/app/layouts/starter/styles.scss',
      header +
        "@use './partials/colors';\n.icon { background: url('./assets/flag.svg?raw'); }\n.other { background: url(./assets/flag.svg); }\n",
    );

    const files = prepare('starter', scaffoldConfig);
    const styles = files.get('src/styles.scss')?.toString();
    expect(styles).toContain("@use './app/partials/colors';");
    expect(styles).toContain("url('../public/assets/flag.svg?raw')");
    expect(styles).toContain('url(../public/assets/flag.svg)');
    expect(styles?.match(/Copyright \(c\) Siemens/g)).toHaveLength(1);
    expect(files.has('src/app/styles.scss')).toBe(false);
    expect(files.has('src/app/partials/_colors.scss')).toBe(true);
    expect(files.has('public/assets/flag.svg')).toBe(true);
  });

  test('supports Sass partials as the insertion anchor', () => {
    const scaffoldConfig = angularConfig();
    fs.renameSync(
      path.join(templateDir, 'src/app/layouts/starter/styles.scss'),
      path.join(templateDir, 'src/app/layouts/starter/_styles.scss'),
    );

    const files = prepare('starter', scaffoldConfig);
    expect(files.get('src/styles.scss')?.toString()).toContain("@use 'flag-icons/sass/flag-icons'");
    expect(files.has('src/app/_styles.scss')).toBe(false);
  });

  test('supports a layout directory index as the insertion anchor', () => {
    const scaffoldConfig = angularConfig();
    fs.renameSync(
      path.join(templateDir, 'src/app/layouts/starter/styles.scss'),
      path.join(templateDir, 'src/app/layouts/starter/_index.scss'),
    );
    writeFile('src/styles.scss', header + "@use './app/layouts/starter';\n");

    const files = prepare('starter', scaffoldConfig);
    expect(files.get('src/styles.scss')?.toString()).toContain("@use 'flag-icons/sass/flag-icons'");
    expect(files.has('src/app/_index.scss')).toBe(false);
  });

  test('removes unselected styles without retaining their dependencies', () => {
    const files = prepare('blank', angularConfig());
    expect(files.get('src/styles.scss')?.toString()).not.toMatch(/layouts\/|flag-icons/);
    expect(files.has('src/app/styles.scss')).toBe(false);
  });

  test('rejects missing inline styles before returning files', () => {
    const scaffoldConfig = angularConfig();
    fs.rmSync(path.join(templateDir, 'src/app/layouts/starter/styles.scss'));
    expect(() => prepare('starter', scaffoldConfig)).toThrow('references missing layout styles');
  });

  test('rejects indented Sass instead of inserting it into SCSS', () => {
    const scaffoldConfig = angularConfig();
    writeFile('src/styles.scss', "@use './app/layouts/starter/styles.sass';\n");
    writeFile('src/app/layouts/starter/styles.sass', 'body\n  color: red\n');
    expect(() => prepare('starter', scaffoldConfig)).toThrow('cannot inline indented Sass');
  });
});

describe('asset extraction', () => {
  test.each(['blank', 'starter'] as const)('copies only %s assets to public', layout => {
    const scaffoldConfig = angularConfig();
    const binary = Buffer.from([0, 255, 128]);
    writeFile('src/app/layouts/blank/assets/i18n/en.json', '{"home":"Home"}\n');
    writeFile('src/app/layouts/starter/assets/i18n/en.json', '{"forms":"Forms"}\n');
    writeFile(`src/app/layouts/${layout}/assets/image.png`, binary);

    const files = prepare(layout, scaffoldConfig);
    expect(files.get('public/assets/i18n/en.json')).toEqual(
      fs.readFileSync(path.join(templateDir, `src/app/layouts/${layout}/assets/i18n/en.json`)),
    );
    expect(files.get('public/assets/image.png')).toEqual(binary);
    expect([...files.keys()].some(file => file.startsWith('src/app/assets/'))).toBe(false);
  });

  test('rejects collisions between public and selected layout assets', () => {
    const scaffoldConfig = angularConfig();
    writeFile('public/assets/i18n/en.json', '{}\n');
    writeFile('src/app/layouts/starter/assets/i18n/en.json', '{}\n');
    expect(() => prepare('starter', scaffoldConfig)).toThrow('maps both');
  });

  test.each([
    { input: 'src/app/layouts/starter/assets', output: '../../outside' },
    { input: 'src/app/layouts/starter/assets/image.svg', output: '..' },
  ])('rejects invalid asset destinations ($output)', ({ input, output }) => {
    const scaffoldConfig = angularConfig();
    scaffoldConfig.layouts.find(layout => layout.id === 'starter')!.scaffold.angular!.assets[0] = {
      glob: '**/*',
      input,
      output,
    };
    writeFile('src/app/layouts/starter/assets/image.svg', '<svg></svg>\n');
    expect(() => prepare('starter', scaffoldConfig)).toThrow('outside the project');
  });
});
