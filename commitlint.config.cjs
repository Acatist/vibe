/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'revert',
        'ci',
        'build',
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],
    'header-max-length': [0, 'always', Infinity],
    'body-max-line-length': [0, 'always', Infinity],
    'subject-max-length': [0, 'always', Infinity],
  },
}
