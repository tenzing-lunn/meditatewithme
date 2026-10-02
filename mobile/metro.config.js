// Metro, with the web app's `lib/` beside it.
//
// `lib/` is the code the site and this app share: the shared hour, the
// timer, the session rules. It is never copied here — Metro watches it in
// place and resolves its packages from this app's node_modules, so one fix
// lands in both. `tests/portability.test.ts` in the web app keeps browser
// globals out of it.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../lib')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
