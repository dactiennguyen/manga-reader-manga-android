/**
 * Mã nguồn addon nạp trực tiếp (không qua bản build) — chỉ cho unit test và
 * để TypeScript kiểm tra mỗi addon export đúng contract AddonModule. App
 * không import file này: app chạy bản build trong src/addons/builtin.generated.ts.
 */
import type { AddonInfo, AddonModule } from '../src/addons/types';
import * as fanfox from './fanfox/main';
import fanfoxInfo from './fanfox/info.json';
import * as madara from './madara/main';
import madaraInfo from './madara/info.json';
import * as madtheme from './madtheme/main';
import madthemeInfo from './madtheme/info.json';
import * as mangabox from './mangabox/main';
import mangaboxInfo from './mangabox/info.json';
import * as mangadex from './mangadex/main';
import mangadexInfo from './mangadex/info.json';
import * as mangakatana from './mangakatana/main';
import mangakatanaInfo from './mangakatana/info.json';
import * as mangatown from './mangatown/main';
import mangatownInfo from './mangatown/info.json';
import * as novelfull from './novelfull/main';
import novelfullInfo from './novelfull/info.json';
import * as themesia from './themesia/main';
import themesiaInfo from './themesia/info.json';
import * as weebcentral from './weebcentral/main';
import weebcentralInfo from './weebcentral/info.json';

export const SOURCE_ADDONS: Record<string, { info: AddonInfo; module: AddonModule }> = {
  fanfox: { info: fanfoxInfo as AddonInfo, module: fanfox },
  madara: { info: madaraInfo as AddonInfo, module: madara },
  madtheme: { info: madthemeInfo as AddonInfo, module: madtheme },
  mangabox: { info: mangaboxInfo as AddonInfo, module: mangabox },
  mangadex: { info: mangadexInfo as AddonInfo, module: mangadex },
  mangakatana: { info: mangakatanaInfo as AddonInfo, module: mangakatana },
  mangatown: { info: mangatownInfo as AddonInfo, module: mangatown },
  novelfull: { info: novelfullInfo as AddonInfo, module: novelfull },
  themesia: { info: themesiaInfo as AddonInfo, module: themesia },
  weebcentral: { info: weebcentralInfo as AddonInfo, module: weebcentral },
};
