import baseConfig from '@siemens/prettier-config';

/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  ...baseConfig,
  trailingComma: 'all',
  overrides: [
    {
      files: 'packages/create-siemens-web/template-element-starter/**/*',
      options: {
        trailingComma: 'none',
      },
    },
  ],
};

export default config;
