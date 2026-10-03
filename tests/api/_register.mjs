// Passed to node as `--import`; installs the resolver in ./_hooks.mjs so the
// route handlers under app/api/ can be imported by a plain `node --test`.
import { register } from 'node:module';

register('./_hooks.mjs', import.meta.url);
