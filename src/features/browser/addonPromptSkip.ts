import { sameUrl } from '../../lib/url';

const skipped = new Set<string>();

export function skipAddonPrompt(url: string): void {
  skipped.add(url);
}

export function consumeAddonPromptSkip(url: string): boolean {
  for (const entry of skipped) {
    if (sameUrl(entry, url)) {
      skipped.delete(entry);
      return true;
    }
  }
  return false;
}
