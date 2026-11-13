/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import fs from 'node:fs';
import path from 'node:path';

type AngularAssetPattern = { glob: string; input: string; output?: string };
type AngularAsset = string | AngularAssetPattern;

export type ScaffoldLayout = {
  id: string;
  name: string;
  description: string;
  scaffold: {
    dependencies?: string[];
    includeLayouts?: string[];
    preserveHierarchy?: boolean;
    angular?: { assets: AngularAssetPattern[] };
  };
};

export type ScaffoldConfig = {
  id: string;
  name: string;
  requiresSiemensRegistry?: boolean;
  layouts: ScaffoldLayout[];
  scaffold: {
    routesFile: string;
    dependencies: string[];
    angular?: boolean;
  };
};

export type TemplatePackage = {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  [key: string]: unknown;
};

type AngularWorkspace = {
  projects: Record<
    string,
    {
      architect: {
        build: { options: { assets: AngularAsset[]; styles: string[] } };
      };
    }
  >;
};

type TemplateFile = { relativePath: string; content: Buffer | string };
type OutputPathMapper = (sourcePath: string) => string;

const appRoot = path.join('src', 'app');
const layoutRoot = path.join(appRoot, 'layouts');
const sourceExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.html',
  '.scss',
  '.sass',
  '.css',
]);
const ignoredDirectories = new Set([
  'node_modules',
  '.git',
  '.angular',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
]);
const ignoredFiles = new Set([
  'scaffold.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  '.DS_Store',
]);

/** Builds the qualified CLI/project ID from a family ID and its local layout ID. */
export const getTemplateId = (familyId: string, layoutId: string) => `${familyId}-${layoutId}`;

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string');
};

/** Reads selection metadata and generation settings, rejecting invalid manifest values. */
export const readScaffoldConfig = (templateDir: string): ScaffoldConfig => {
  const file = path.join(templateDir, 'scaffold.json');
  let config: ScaffoldConfig;
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    throw new Error(
      `Template "${path.basename(templateDir)}" has a missing or invalid scaffold.json.`,
    );
  }
  const invalid = () =>
    new Error(`Template "${path.basename(templateDir)}" has an invalid scaffold.json.`);
  if (
    typeof config?.id !== 'string' ||
    typeof config.name !== 'string' ||
    !Array.isArray(config.layouts) ||
    config.layouts.length === 0 ||
    typeof config.scaffold?.routesFile !== 'string' ||
    !isStringArray(config.scaffold.dependencies) ||
    (config.requiresSiemensRegistry !== undefined &&
      typeof config.requiresSiemensRegistry !== 'boolean') ||
    (config.scaffold.angular !== undefined && typeof config.scaffold.angular !== 'boolean')
  ) {
    throw invalid();
  }
  for (const layout of config.layouts) {
    if (
      typeof layout?.id !== 'string' ||
      !/^[a-z\d][a-z\d_-]*$/.test(layout.id) ||
      typeof layout.name !== 'string' ||
      typeof layout.description !== 'string' ||
      !layout.scaffold ||
      typeof layout.scaffold !== 'object' ||
      Array.isArray(layout.scaffold)
    ) {
      throw invalid();
    }
    const settings = layout.scaffold;
    if (
      (settings.dependencies !== undefined && !isStringArray(settings.dependencies)) ||
      (settings.includeLayouts !== undefined && !isStringArray(settings.includeLayouts)) ||
      (settings.preserveHierarchy !== undefined &&
        typeof settings.preserveHierarchy !== 'boolean') ||
      (settings.angular !== undefined &&
        (!Array.isArray(settings.angular?.assets) ||
          !settings.angular.assets.every((asset: AngularAssetPattern) => {
            return (
              typeof asset?.glob === 'string' &&
              typeof asset.input === 'string' &&
              (asset.output === undefined || typeof asset.output === 'string')
            );
          })))
    ) {
      throw invalid();
    }
  }
  const layoutIds = new Set<string>();
  for (const layout of config.layouts) {
    if (layoutIds.has(layout.id)) {
      throw new Error(`Template "${config.id}" declares duplicate layout ID "${layout.id}".`);
    }
    layoutIds.add(layout.id);
  }
  for (const layout of config.layouts) {
    for (const included of layout.scaffold.includeLayouts ?? []) {
      if (!layoutIds.has(included)) {
        throw new Error(`Layout "${layout.id}" includes unknown layout "${included}".`);
      }
    }
  }
  return config;
};

/** Resolves included layouts once and rejects missing references or circular composition. */
const resolveLayouts = (config: ScaffoldConfig, layoutId: string): ScaffoldLayout[] => {
  const definitions = new Map(config.layouts.map(layout => [layout.id, layout]));
  const resolved = new Map<string, ScaffoldLayout>();
  const active = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) {
      throw new Error(`Template "${config.id}" has a circular layout reference at "${id}".`);
    }
    if (resolved.has(id)) {
      return;
    }
    const layout = definitions.get(id);
    if (!layout) {
      throw new Error(`Template "${config.id}" references unknown layout "${id}".`);
    }
    active.add(id);
    for (const included of layout.scaffold.includeLayouts ?? []) {
      visit(included);
    }
    active.delete(id);
    resolved.set(id, layout);
  };
  visit(layoutId);
  return [...resolved.values()];
};

const walkTemplateDir = (dir: string, prefix = ''): string[] => {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      if (
        (!prefix && ignoredDirectories.has(entry.name)) ||
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === '__screenshots__' ||
        relativePath === path.join('playwright', 'results')
      ) {
        continue;
      }
      files.push(...walkTemplateDir(path.join(dir, entry.name), relativePath));
    } else if ((!prefix && ignoredFiles.has(entry.name)) || entry.name.endsWith('.tsbuildinfo')) {
      continue;
    } else {
      files.push(relativePath);
    }
  }
  return files;
};

const includesLayoutFile = (relativePath: string, layouts: Set<string>) => {
  const normalizedPath = path.normalize(relativePath);
  if (!normalizedPath.startsWith(layoutRoot + path.sep)) {
    return true;
  }
  return layouts.has(path.relative(layoutRoot, normalizedPath).split(path.sep)[0]);
};

/** Maps the selected route entry and flattens app/public assets unless hierarchy is preserved. */
const createOutputPathMapper = (
  layout: string,
  routesFile: string,
  assets: AngularAssetPattern[],
  preserveHierarchy: boolean,
): OutputPathMapper => {
  const selectedRoot = path.join(layoutRoot, layout);
  const routeExtension = path.extname(routesFile);
  const layoutRoutes = path.join(selectedRoot, `routes${routeExtension}`);
  const layoutRoutesModule = path.join(selectedRoot, 'routes');
  const routesModule = path.join(
    path.dirname(routesFile),
    path.basename(routesFile, routeExtension),
  );
  return sourcePath => {
    const normalizedPath = path.normalize(sourcePath);
    if (preserveHierarchy) {
      return normalizedPath;
    }
    if (normalizedPath === layoutRoutes) {
      return routesFile;
    }
    if (normalizedPath === layoutRoutesModule) {
      return routesModule;
    }
    for (const asset of assets) {
      const input = path.normalize(asset.input);
      if (normalizedPath === input || normalizedPath.startsWith(input + path.sep)) {
        return path.join('public', asset.output ?? '', path.relative(input, normalizedPath));
      }
    }
    if (normalizedPath === selectedRoot || normalizedPath.startsWith(selectedRoot + path.sep)) {
      return path.join(appRoot, path.relative(selectedRoot, normalizedPath));
    }
    return normalizedPath;
  };
};

/** Keeps relative imports and resource references valid when files move to their output paths. */
const rebaseReferences = (
  content: string,
  sourcePath: string,
  outputPath: string,
  getOutputPath: OutputPathMapper,
) => {
  const rebase = (reference: string) => {
    const suffixIndex = reference.search(/[?#]/);
    const referencePath = suffixIndex === -1 ? reference : reference.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? '' : reference.slice(suffixIndex);
    const sourceTarget = path.join(path.dirname(sourcePath), referencePath);
    const previous = path.relative(path.dirname(sourcePath), sourceTarget);
    const next = path.relative(path.dirname(outputPath), getOutputPath(sourceTarget));
    if (previous === next) {
      return reference;
    }
    const relative = next === '..' || next.startsWith('..' + path.sep) ? next : './' + next;
    const trailingSlash = referencePath.endsWith('/') && !relative.endsWith('/') ? '/' : '';
    return relative.split(path.sep).join('/') + trailingSlash + suffix;
  };
  const replaceReference = (_match: string, prefix: string, quote: string, reference: string) =>
    prefix + quote + rebase(reference) + quote;

  return content
    .replace(
      /(\bfrom\s+|\bimport\s*(?:\(\s*)?|\b(?:require|URL|url)\(\s*|\b(?:templateUrl|styleUrl)\s*:\s*|\b(?:src|href)\s*=\s*|@(?:use|forward|import)\s+)(['"])(\.[^'"]*)\2/g,
      replaceReference,
    )
    .replace(
      /(\bstyleUrls\s*:\s*\[)([^\]]*)(\])/g,
      (_match: string, prefix: string, values: string, suffix: string) => {
        return (
          prefix +
          values.replace(
            /(['"])(\.[^'"]*)\1/g,
            (_value: string, quote: string, reference: string) => {
              return quote + rebase(reference) + quote;
            },
          ) +
          suffix
        );
      },
    )
    .replace(
      /(\burl\(\s*)(\.[^)'"\s]+)(?=\s*\))/g,
      (_match: string, prefix: string, reference: string) => {
        return prefix + rebase(reference);
      },
    );
};

/**
 * Inlines selected layout SCSS into global styles and removes unselected imports.
 * Tracks inlined files so they are not copied separately.
 */
const prepareGlobalStyles = (
  templateDir: string,
  styles: string[],
  layouts: Set<string>,
  allFiles: string[],
  getOutputPath: OutputPathMapper,
) => {
  const contents = new Map<string, string>();
  const inlinedFiles = new Set<string>();
  const sourceFiles = new Set(allFiles);
  for (const file of styles) {
    const sourcePath = path.normalize(file);
    if (path.extname(file) !== '.scss' || sourcePath.startsWith('node_modules' + path.sep)) {
      continue;
    }
    const content = fs.readFileSync(path.join(templateDir, sourcePath), 'utf-8');
    contents.set(
      sourcePath,
      content.replace(
        /^@use[\t ]+(['"])([^'"\r\n]+)\1;[\t ]*(?:\r?\n|$)/gm,
        (statement: string, _quote: string, reference: string) => {
          const modulePath = path.join(path.dirname(sourcePath), reference);
          if (!modulePath.startsWith(layoutRoot + path.sep)) {
            return statement;
          }
          if (!includesLayoutFile(modulePath, layouts)) {
            return '';
          }
          const candidates = path.extname(modulePath)
            ? [modulePath, path.join(path.dirname(modulePath), '_' + path.basename(modulePath))]
            : [
                modulePath + '.scss',
                path.join(path.dirname(modulePath), '_' + path.basename(modulePath) + '.scss'),
                path.join(modulePath, '_index.scss'),
              ];
          const stylesheet = candidates.find(candidate => sourceFiles.has(candidate));
          if (!stylesheet) {
            throw new Error(
              `Global stylesheet "${file}" references missing layout styles "${reference}".`,
            );
          }
          if (path.extname(stylesheet) === '.sass') {
            throw new Error(
              `Global stylesheet "${file}" cannot inline indented Sass from "${reference}".`,
            );
          }
          inlinedFiles.add(stylesheet);
          const fragment = fs
            .readFileSync(path.join(templateDir, stylesheet), 'utf-8')
            .replace(
              /^\/\/ Copyright[^\r\n]*\r?\n\/\/ SPDX-License-Identifier:[^\r\n]*\r?\n(?:\r?\n)*/,
              '',
            );
          return (
            rebaseReferences(
              fragment,
              stylesheet,
              getOutputPath(sourcePath),
              getOutputPath,
            ).trimEnd() + '\n'
          );
        },
      ),
    );
  }
  return { contents, inlinedFiles };
};

const replaceProjectReferences = (value: unknown, previous: string, next: string): unknown => {
  if (typeof value === 'string') {
    return value.replaceAll(previous, next);
  }
  if (Array.isArray(value)) {
    return value.map(entry => replaceProjectReferences(entry, previous, next));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key.replaceAll(previous, next),
        replaceProjectReferences(entry, previous, next),
      ]),
    );
  }
  return value;
};

const formatJson = (value: unknown, depth = 0, prefixWidth = 0): string => {
  const indentation = '  '.repeat(depth);
  if (Array.isArray(value)) {
    const entries = value.map(entry => formatJson(entry, depth + 1));
    const inline = `[${entries.join(', ')}]`;
    if (
      entries.length === 0 ||
      (!inline.includes('\n') && indentation.length + prefixWidth + inline.length <= 100)
    ) {
      return inline;
    }
    return `[\n${entries.map(entry => `${indentation}  ${entry}`).join(',\n')}\n${indentation}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, entry]) => {
      const property = `${JSON.stringify(key)}: `;
      return `${indentation}  ${property}${formatJson(entry, depth + 1, property.length)}`;
    });
    return entries.length ? `{\n${entries.join(',\n')}\n${indentation}}` : '{}';
  }
  return JSON.stringify(value)!;
};

export const prepareTemplateFiles = ({
  templateDir,
  layout,
  packageName,
  templatePackage,
  config,
}: {
  templateDir: string;
  layout: string;
  packageName: string;
  templatePackage: TemplatePackage;
  config: ScaffoldConfig;
}): TemplateFile[] => {
  const layouts = resolveLayouts(config, layout);
  const selectedLayout = layouts.at(-1)!;
  const templateName = getTemplateId(config.id, selectedLayout.id);
  const preserveHierarchy = selectedLayout.scaffold.preserveHierarchy === true;
  const layoutIds = new Set(layouts.map(selected => selected.id));
  const settings = config.scaffold;
  const allFiles = walkTemplateDir(templateDir);
  const routesFile = path.normalize(settings.routesFile);
  if (!allFiles.includes(routesFile)) {
    throw new Error(
      `Template "${templateName}" is missing its route entry "${settings.routesFile}".`,
    );
  }

  for (const selectedLayout of layouts) {
    if (selectedLayout.scaffold.preserveHierarchy) {
      continue;
    }
    const layoutRoutes = path.join(
      layoutRoot,
      selectedLayout.id,
      `routes${path.extname(routesFile)}`,
    );
    if (!allFiles.includes(layoutRoutes)) {
      throw new Error(
        `Template "${templateName}" is missing the "${selectedLayout.id}" layout routes.`,
      );
    }
  }

  const dependencyNames = new Set([
    ...settings.dependencies,
    ...layouts.flatMap(selectedLayout => selectedLayout.scaffold.dependencies ?? []),
  ]);
  const sourceDependencies = templatePackage.dependencies ?? {};
  for (const dependency of dependencyNames) {
    if (!Object.hasOwn(sourceDependencies, dependency)) {
      throw new Error(`Template "${templateName}" is missing the dependency "${dependency}".`);
    }
  }
  const pkg: TemplatePackage = {
    ...templatePackage,
    name: packageName,
    dependencies: Object.fromEntries(
      Object.entries(sourceDependencies).filter(([dependency]) => dependencyNames.has(dependency)),
    ),
  };

  const layoutAssets = preserveHierarchy ? [] : (selectedLayout.scaffold.angular?.assets ?? []);
  const getOutputPath = createOutputPathMapper(layout, routesFile, layoutAssets, preserveHierarchy);
  let globalStyles: ReturnType<typeof prepareGlobalStyles> | undefined;
  let angularContent: string | undefined;
  if (settings.angular) {
    const sourceWorkspace: AngularWorkspace = JSON.parse(
      fs.readFileSync(path.join(templateDir, 'angular.json'), 'utf-8'),
    );
    const projectNames = Object.keys(sourceWorkspace.projects);
    if (projectNames.length !== 1) {
      throw new Error(`Template "${templateName}" must define exactly one Angular project.`);
    }
    const sourceProject = projectNames[0];
    const workspace = replaceProjectReferences(
      sourceWorkspace,
      sourceProject,
      templateName,
    ) as AngularWorkspace;
    const options = workspace.projects[templateName].architect.build.options;
    const selectedStyles = options.styles.filter(file => includesLayoutFile(file, layoutIds));
    if (!preserveHierarchy) {
      globalStyles = prepareGlobalStyles(
        templateDir,
        selectedStyles,
        layoutIds,
        allFiles,
        getOutputPath,
      );
    }
    options.styles = selectedStyles
      .filter(file => !globalStyles?.inlinedFiles.has(path.normalize(file)))
      .map(getOutputPath);
    if (!preserveHierarchy && selectedLayout.scaffold.angular) {
      options.assets = [
        ...options.assets.filter(asset => {
          const input = typeof asset === 'string' ? asset : asset.input;
          return !path.normalize(input).startsWith(layoutRoot + path.sep);
        }),
        { glob: '**/*', input: 'public' },
      ];
    }
    angularContent = formatJson(workspace) + '\n';
    if (pkg.scripts) {
      pkg.scripts = replaceProjectReferences(pkg.scripts, sourceProject, templateName) as Record<
        string,
        string
      >;
    }
  }

  const files = allFiles
    .filter(
      file =>
        (preserveHierarchy || file !== routesFile) &&
        includesLayoutFile(file, layoutIds) &&
        !globalStyles?.inlinedFiles.has(file),
    )
    .map(sourcePath => ({ sourcePath, relativePath: getOutputPath(sourcePath) }));
  const destinations = new Map<string, string>();
  for (const { sourcePath, relativePath } of files) {
    if (
      path.isAbsolute(relativePath) ||
      relativePath === '.' ||
      relativePath === '..' ||
      relativePath.startsWith('..' + path.sep)
    ) {
      throw new Error(`Template "${templateName}" maps "${sourcePath}" outside the project.`);
    }
    const destinationKey = relativePath.toLowerCase();
    const previous = destinations.get(destinationKey);
    if (previous !== undefined) {
      throw new Error(
        `Template "${templateName}" maps both "${previous}" and "${sourcePath}" to "${relativePath}".`,
      );
    }
    destinations.set(destinationKey, sourcePath);
  }
  for (const { relativePath } of files) {
    let parent = path.dirname(relativePath);
    while (parent !== '.') {
      if (destinations.has(parent.toLowerCase())) {
        throw new Error(`Template "${templateName}" maps a file and a directory to "${parent}".`);
      }
      parent = path.dirname(parent);
    }
  }

  return files.map(({ sourcePath, relativePath }) => {
    let content: Buffer | string;
    if (sourcePath === 'package.json') {
      content = formatJson(pkg) + '\n';
    } else if (sourcePath === 'angular.json' && angularContent !== undefined) {
      content = angularContent;
    } else {
      content =
        globalStyles?.contents.get(sourcePath) ??
        fs.readFileSync(path.join(templateDir, sourcePath));
    }
    if (!preserveHierarchy && sourceExtensions.has(path.extname(sourcePath))) {
      content = rebaseReferences(content.toString(), sourcePath, relativePath, getOutputPath);
    }
    if (path.basename(relativePath) === 'index.html') {
      content = content.toString().replace(/<title>.*?<\/title>/, `<title>${packageName}</title>`);
    }
    return { relativePath, content };
  });
};
