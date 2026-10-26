// Moves the body of "## Unreleased" under "## <version> - <date>" and leaves a fresh, empty Unreleased.
export function promoteUnreleased(text, version, date) {
  const heading = /^## Unreleased[ \t]*$/m.exec(text);
  if (!heading) throw new Error('Changelog has no "## Unreleased" section');

  const bodyStart = heading.index + heading[0].length;
  const rest = text.slice(bodyStart);
  const next = /^## /m.exec(rest);
  const bodyEnd = next ? next.index : rest.length;
  const body = rest.slice(0, bodyEnd);

  if (body.trim() === '') throw new Error('The "## Unreleased" section is empty; nothing to release');

  const normalized = `${body.replace(/^\n*/, '').replace(/\s*$/, '')}\n${next ? '\n' : ''}`;
  return `${text.slice(0, heading.index)}## Unreleased\n\n## ${version} - ${date}\n\n${normalized}${rest.slice(bodyEnd)}`;
}
