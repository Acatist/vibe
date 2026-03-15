/** @type {import('lint-staged').Config} */
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{css,json,md}': ['prettier --write'],
}
