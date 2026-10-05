export interface Topic {
  slug: string;
  name: string;
  categoryGroup: string;
}

export interface ShellEditorial {
  overview: string;
  checks: string[];
  faq: { question: string; answer: string }[];
  steps?: string[];
  records?: string[];
  providerQuestions?: string[];
  pitfalls?: string[];
  deepDive?: string[];
  reviewChecklist?: string[];
  sources?: { label: string; href: string }[];
}

export interface GuideSection {
  heading: string;
  body: string[];
  list?: string[];
}

export interface GuideDoc {
  slug: string;
  title: string;
  summary: string;
  sections: GuideSection[];
  internalLinks: { label: string; href: string }[];
  officialLink: { label: string; href: string };
}

export const GUIDE_DOCS: Record<string, GuideDoc>;

export const CONDITION_TOPICS: readonly Topic[];
export const FUNDING_TOPICS: readonly Topic[];
export const LANGUAGE_TOPICS: readonly Topic[];
export function conditionShellEditorial(topic: Topic): ShellEditorial;
export function fundingShellEditorial(topic: Topic): ShellEditorial;
export function languageShellEditorial(topic: Topic): ShellEditorial;
