/**
 * WordPress escapes special characters (&, <, >, quotes) in post and
 * term titles at the database level — this is normal, expected
 * WordPress behavior, not a bug on the WordPress side. Any title
 * coming from the REST API needs this before being shown as plain
 * text (React already escapes it correctly when rendered as text
 * content, so this only needs to happen once, here, not wherever a
 * title is displayed).
 */
export function decodeHtmlEntities(text: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = text;
  return el.value;
}
