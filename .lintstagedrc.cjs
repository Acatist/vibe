/** @type {import('lint-staged').Config} */
module.exports = {
  '*.{ts,tsx}': ['eslint --fix'],
}
