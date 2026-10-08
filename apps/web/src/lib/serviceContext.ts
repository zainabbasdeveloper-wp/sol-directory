import { unslugify } from '../data/slugHelpers';

/**
 * The service a visitor was looking at when they opened the "Get matched" form, taken from the page they are on
 * (e.g. /services/personal-care -> "Personal Care"). The form no longer asks for the service, so this is how the
 * site still learns it. It is only used to decide which businesses hear about the enquiry, never for matching.
 */
export function serviceContextFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/services\/([a-z0-9-]+)/i);
  return match ? unslugify(match[1]).slice(0, 80) : undefined;
}
