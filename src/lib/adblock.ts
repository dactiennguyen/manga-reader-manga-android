import { useAdblock, type BlockKind } from '../store/useAdblock';
import { getText } from './http';
import { storage } from './storage';
import { getHost } from './url';


const BUILTIN_ADS = [
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'googletagservices.com',
  'adservice.google.com', '2mdn.net', 'adnxs.com', 'amazon-adsystem.com', 'criteo.com',
  'criteo.net', 'taboola.com', 'outbrain.com', 'popads.net', 'popcash.net', 'propellerads.com',
  'propellerclick.com', 'adsterra.com', 'exoclick.com', 'exosrv.com', 'juicyads.com',
  'trafficjunky.net', 'hilltopads.net', 'adcash.com', 'mgid.com', 'revcontent.com', 'zedo.com',
  'pubmatic.com', 'rubiconproject.com', 'openx.net', 'casalemedia.com', 'smartadserver.com',
  'adform.net', 'media.net', 'bidswitch.net', 'sharethrough.com', 'teads.tv', 'yieldmo.com',
  'onclickads.net', 'onclkds.com', 'a-ads.com', 'adskeeper.co.uk', 'adskeeper.com',
  'moatads.com', 'serving-sys.com', 'adsrvr.org', 'advertising.com', 'yieldlove.com',
  'clickadu.com', 'admaven.com', 'ad-maven.com', 'richpush.co', 'pushame.com', 'evadav.com',
  'galaksion.com', 'trafficstars.com', 'tsyndicate.com', 'adspyglass.com', 'bidvertiser.com',
  'infolinks.com', 'vidoomy.com', 'aniview.com', 'spotxchange.com', 'unrulymedia.com',
];

const BUILTIN_TRACKERS = [
  'google-analytics.com', 'googletagmanager.com', 'scorecardresearch.com', 'quantserve.com',
  'hotjar.com', 'mixpanel.com', 'segment.io', 'segment.com', 'clarity.ms', 'bat.bing.com',
  'mc.yandex.ru', 'histats.com', 'statcounter.com', 'adsafeprotected.com', 'doubleverify.com',
  'chartbeat.com', 'chartbeat.net', 'newrelic.com', 'nr-data.net', 'branch.io', 'amplitude.com',
  'fullstory.com', 'mouseflow.com', 'crazyegg.com', 'kissmetrics.com', 'optimizely.com',
  'connect.facebook.net', 'analytics.tiktok.com', 'ads-twitter.com', 'static.ads-twitter.com',
  'analytics.twitter.com', 'pixel.wp.com', 'stats.wp.com', 'cloudflareinsights.com',
];

const ADS_KEY = 'adblock:ads';
const TRACKERS_KEY = 'adblock:trackers';

let ads: Set<string> | undefined;
let trackers: Set<string> | undefined;

function parseList(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/[#!].*$/, '').trim();
    if (!line) {
      continue;
    }
    const parts = line.split(/\s+/);
    const domain = (parts.length > 1 ? parts[1] : parts[0]).toLowerCase();
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain) && domain !== 'localhost') {
      out.push(domain);
    }
  }
  return out;
}

function ensureLoaded(): void {
  if (ads && trackers) {
    return;
  }
  ads = new Set([...BUILTIN_ADS, ...parseList(storage.getString(ADS_KEY) ?? '')]);
  trackers = new Set([...BUILTIN_TRACKERS, ...parseList(storage.getString(TRACKERS_KEY) ?? '')]);
}

export function matchBlockedHost(
  host: string,
  trackingProtection = true,
): { kind: BlockKind; domain: string } | null {
  ensureLoaded();
  let candidate = host.toLowerCase();
  while (candidate.includes('.')) {
    if (ads!.has(candidate)) {
      return { kind: 'ad', domain: candidate };
    }
    if (trackingProtection && trackers!.has(candidate)) {
      return { kind: 'tracker', domain: candidate };
    }
    candidate = candidate.slice(candidate.indexOf('.') + 1);
  }
  return null;
}

export function classifyHost(host: string, trackingProtection = true): BlockKind | null {
  return matchBlockedHost(host, trackingProtection)?.kind ?? null;
}

export function classifyUrl(url: string, trackingProtection = true): BlockKind | null {
  const host = getHost(url);
  return host ? classifyHost(host, trackingProtection) : null;
}

export async function updateBlockLists(): Promise<{ ads: number; trackers: number }> {
  const { adsListUrl, trackersListUrl, setListMeta } = useAdblock.getState();
  const [adsText, trackersText] = await Promise.all([
    getText(adsListUrl, { timeoutMs: 60000 }),
    getText(trackersListUrl, { timeoutMs: 60000 }),
  ]);
  const adsList = parseList(adsText);
  const trackersList = parseList(trackersText);
  if (!adsList.length && !trackersList.length) {
    throw new Error('Danh sách tải về rỗng hoặc sai định dạng.');
  }
  storage.set(ADS_KEY, adsList.join('\n'));
  storage.set(TRACKERS_KEY, trackersList.join('\n'));
  ads = undefined;
  trackers = undefined;
  const counts = { ads: adsList.length, trackers: trackersList.length };
  setListMeta({ adsCount: counts.ads, trackersCount: counts.trackers, updatedAt: Date.now() });
  return counts;
}

export function builtinListSize(): { ads: number; trackers: number } {
  return { ads: BUILTIN_ADS.length, trackers: BUILTIN_TRACKERS.length };
}

export const COSMETIC_CSS = [
  'ins.adsbygoogle',
  '[id^="google_ads_"]',
  '[id^="div-gpt-ad"]',
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]',
  '.adsbygoogle',
  '.ad-container',
  '.ads-container',
  '.banner-ads',
  '[class*="sponsor-ad"]',
  'div[id*="ScriptRoot"]',
  'a[href*="/aff_c?"]',
].join(',');
