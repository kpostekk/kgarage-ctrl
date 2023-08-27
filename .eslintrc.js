module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/strict-type-checked'],
  overrides: [
    {
      env: {
        node: true,
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    quotes: ['warn', 'single'],
    indent: ['warn', 2, { SwitchCase: 1 }],
    semi: ['off'],
    'comma-dangle': ['warn', 'always-multiline'],
    'dot-notation': 'off',
    eqeqeq: 'warn',
    curly: ['warn', 'all'],
    'brace-style': ['warn'],
    'prefer-arrow-callback': ['warn'],
    'max-len': ['warn', 140],
    'no-console': ['warn'], // use the provided Homebridge log method instead
    'no-non-null-assertion': ['off'],
    'comma-spacing': ['error'],
    'no-multi-spaces': ['warn', { ignoreEOLComments: true }],
    'no-trailing-spaces': ['warn'],
    'lines-between-class-members': [
      'warn',
      'always',
      { exceptAfterSingleLine: true },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/semi': ['warn'],
    '@typescript-eslint/member-delimiter-style': ['warn'],
  },
};
