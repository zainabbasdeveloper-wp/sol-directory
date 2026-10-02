export interface ServiceEditorial {
  name: string;
  shortAnswer: string;
  overview: string[];
  includes: string[];
  planning: string[];
  providerQuestions: string[];
  funding: string[];
  safeguards: string[];
  sources: { label: string; href: string }[];
}

export const SERVICE_EDITORIAL: Readonly<Record<string, ServiceEditorial>>;
export function serviceEditorialFor(name: string): ServiceEditorial | undefined;
export function serviceEditorialWordCount(content: ServiceEditorial): number;
