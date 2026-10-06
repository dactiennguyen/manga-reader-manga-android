import { addonEngine } from '../../src/addons/engine';
import type { AddonInfo, AddonModule } from '../../src/addons/types';
import type { Engine } from '../../src/sources/types';

export function sourceEngine(uid: string): Engine {
  const info: AddonInfo = require(`../../addons/${uid}/info.json`);
  const mod: AddonModule = require(`../../addons/${uid}/main`);
  return addonEngine(info, mod);
}
