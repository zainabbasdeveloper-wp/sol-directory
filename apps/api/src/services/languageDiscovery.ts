/**
 * Finds which languages a business says it supports, from its OWN website only — never guessed and never
 * taken from anyone else's site. Same reliability contract as emailDiscovery.ts and phoneDiscovery.ts.
 *
 * A language name appearing on a page is NOT enough: sites list languages in translation menus, news links
 * and recipes. A language only counts when the sentence it appears in is clearly about the business's own
 * people or service, in one of two shapes:
 *
 *  1. "<Language>-speaking" / "<Language> speaker(s)", e.g. "Arabic speaking support workers".
 *  2. A statement phrase followed closely by the language, e.g. "we speak Arabic, Greek and Italian",
 *     "languages spoken: Vietnamese", "bilingual staff (Mandarin)", "interpreters available in Hindi".
 *
 * Translation widgets are dropped before reading (select menus, elements named translate / language
 * switcher), and any statement that lists more than MAX_PER_STATEMENT languages is treated as a menu and
 * ignored. English is never recorded, since every site is in it.
 */

import { LANGUAGE_TOPICS } from '@soldirectory/topic-content';
import { fetchText } from './logoDiscovery.js';

/** Extra spellings that map onto a canonical topic name from LANGUAGE_TOPICS. */
const ALIASES: Record<string, string> = {
  persian: 'Persian (Farsi)',
  farsi: 'Persian (Farsi)',
  tagalog: 'Tagalog',
  filipino: 'Tagalog',
  mandarin: 'Mandarin',
  cantonese: 'Cantonese',
};

/** Languages only recorded when the topic list has them as a plain single-word name. */
function buildLanguageMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const topic of LANGUAGE_TOPICS) {
    // Skip entries that are services rather than languages (interpreters, easy read, etc.) and multi-part names.
    if (topic.categoryGroup === 'Access & Interpreting') continue;
    if (/service|interpret|document|material|booking/i.test(topic.name)) continue;
    const plain = topic.name.replace(/\s*\(.*\)\s*/, '').trim().toLowerCase();
    if (/^[a-z]+$/.test(plain)) map.set(plain, topic.name);
  }
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (LANGUAGE_TOPICS.some((t) => t.name === canonical)) map.set(alias, canonical);
  }
  map.set('auslan', 'Auslan');
  return map;
}

const LANGUAGE_BY_WORD = buildLanguageMap();
const LANGUAGE_WORD_RE = new RegExp(`\\b(${[...LANGUAGE_BY_WORD.keys()].sort((a, b) => b.length - a.length).join('|')})\\b`, 'gi');

const LANG_ALT = [...LANGUAGE_BY_WORD.keys()].sort((a, b) => b.length - a.length).join('|');
/** "Mandarin speaking", "Mandarin and Cantonese speaking", "Greek-speaking", "Arabic speakers". */
const SPEAKING_RE = new RegExp(`\\b((?:${LANG_ALT})(?:\\s*(?:,|/|&|and|or)\\s*(?:${LANG_ALT}))*)[\\s-]+(?:speaking|speakers?)\\b`, 'gi');

/** A phrase that introduces a statement about who or what the business offers. The language(s) must follow it closely. */
const STATEMENT_RE = /\b(?:languages?\s+(?:we\s+)?(?:spoken|speak|offered|supported|available|include|offer|provide)|languages?\s*:|(?:also\s+|can\s+|proudly\s+|fluently\s+)*speaks?(?!\s+(?:to|with|about|up|out|directly|now))|communicate\s+in|(?:support|services?|care|assistance)\s+(?:is\s+|are\s+)?(?:offered\s+|provided\s+|delivered\s+)?in|bi-?lingual|multi-?lingual|interpreters?\s+(?:are\s+)?available\s+in|available\s+in|fluent\s+in|proficient\s+in)\b/gi;

const WINDOW_CHARS = 120;
const MAX_PER_STATEMENT = 8;
const MAX_LANGUAGES = 12;

function visibleText(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<select[\s\S]*?<\/select>/gi, ' ')
    .replace(/<(nav|footer)\b[\s\S]*?<\/\1>/gi, ' ')
    // Language switchers and translation widgets, by the names sites give them.
    .replace(/<(div|ul|li|span|a|section)\b[^>]*(?:translate|lang-?switch|language-?(?:selector|switch|menu|picker)|wpml|polylang|gtranslate)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return cleaned
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function languagesIn(fragment: string): string[] {
  const found: string[] = [];
  for (const m of fragment.matchAll(LANGUAGE_WORD_RE)) {
    const name = LANGUAGE_BY_WORD.get(m[1].toLowerCase());
    if (name && !found.includes(name)) found.push(name);
  }
  return found;
}

/** Pulls the languages a page states for the business itself. Pure and synchronous: exported so the script and tests can run it on HTML already downloaded. */
export function extractLanguagesFromHtml(html: string): string[] {
  const text = visibleText(html);
  const result = new Set<string>();

  // Shape 1: "<Language>-speaking support workers".
  for (const m of text.matchAll(SPEAKING_RE)) languagesIn(m[1]).forEach((l) => result.add(l));

  // Shape 2: a statement phrase, then the language(s) right after it (stopping at the end of the sentence).
  for (const m of text.matchAll(STATEMENT_RE)) {
    const start = (m.index ?? 0) + m[0].length;
    let fragment = text.slice(start, start + WINDOW_CHARS);
    const sentenceEnd = fragment.search(/[.!?](\s|$)/);
    if (sentenceEnd >= 0) fragment = fragment.slice(0, sentenceEnd);
    const langs = languagesIn(fragment);
    if (langs.length > 0 && langs.length <= MAX_PER_STATEMENT) langs.forEach((l) => result.add(l));
  }

  return [...result].slice(0, MAX_LANGUAGES);
}

/** Paths where a business typically describes its team and services. */
export const ABOUT_PATHS = ['/about', '/about-us', '/our-team', '/team', '/our-services', '/services', '/contact', '/contact-us'];
/** How many of those pages to read after the homepage (each only if it responds). */
const MAX_EXTRA_PAGES = 3;

/**
 * Languages a business's own website says it supports. Looks at the homepage, then up to three about / team /
 * services / contact pages that respond. Returns [] when nothing is clearly stated, and never throws.
 */
export async function discoverLanguages(website: string): Promise<string[]> {
  let homepage: string;
  try {
    homepage = new URL(website).toString();
  } catch {
    return [];
  }

  const found = new Set<string>();
  const homeHtml = await fetchText(homepage);
  if (homeHtml) extractLanguagesFromHtml(homeHtml).forEach((l) => found.add(l));

  let read = 0;
  for (const path of ABOUT_PATHS) {
    if (read >= MAX_EXTRA_PAGES) break;
    const html = await fetchText(new URL(path, homepage).toString());
    if (!html) continue;
    read++;
    extractLanguagesFromHtml(html).forEach((l) => found.add(l));
  }

  return [...found].slice(0, MAX_LANGUAGES);
}
