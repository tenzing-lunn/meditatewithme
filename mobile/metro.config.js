// Metro, with the web app's `lib/` and its sounds beside it.
//
// `lib/` is the code the site and this app share: the shared hour, the
// timer, the session rules, the bells. It is never copied here — Metro
// watches it in place and resolves its packages from this app's
// node_modules, so one fix lands in both. `tests/portability.test.ts` in the
// web app keeps browser globals out of it. The beds and the drum are read
// from the site's `public/sounds/` the same way (`audio.ts`), so the app
// bundles the very files the site serves.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../lib'), path.resolve(__dirname, '../public/sounds')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
