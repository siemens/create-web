/*
 * Copyright (c) Siemens 2026
 * SPDX-License-Identifier: MIT
 */
import fs from 'node:fs';
import process from 'node:process';

const [manager, ...args] = process.argv.slice(2);
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
fs.appendFileSync(
  process.env.PACKAGE_MANAGER_LOG,
  JSON.stringify({ manager, args, cwd: process.cwd(), projectName: pkg.name }) + '\n',
);

if ((args[0] === 'install' || args.length === 0) && process.env.PACKAGE_MANAGER_INSTALL_EXIT_CODE) {
  process.exit(Number(process.env.PACKAGE_MANAGER_INSTALL_EXIT_CODE));
}
