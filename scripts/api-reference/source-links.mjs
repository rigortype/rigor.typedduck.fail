const tokens = ['commit', 'path', 'start_line', 'end_line'];

export function sourceLinksFor(data, policy, commit) {
  if (!policy) return {};
  const template = policy.template;
  if (typeof template !== 'string' || !/^https?:\/\//.test(template) || !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid API source URL template or commit');
  const found = [...template.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]);
  if (found.some((token) => !tokens.includes(token)) || !['commit', 'path', 'start_line'].every((token) => found.includes(token)) || /[{}]/.test(template.replace(/\{([^{}]+)\}/g, ''))) throw new Error('API source URL template requires commit, path and start_line; only documented tokens are supported');
  const result = {};
  for (const scope of data.scopes) {
    const files = new Set(scope.files.map((file) => file.path));
    for (const row of scope.declarations) {
      const span = row.span;
      if (!span) continue;
      const file = span.path;
      if (typeof file !== 'string' || !file || /[\\\x00-\x1f]/.test(file) || /^[A-Za-z]:/.test(file) || file.split('/').some((part) => ['', '.', '..'].includes(part)) || !files.has(file)) throw new Error('API source link path is not a selected repository-relative file');
      if (!Number.isInteger(span.start_line) || span.start_line < 1 || !Number.isInteger(span.end_line) || span.end_line < span.start_line) continue;
      const values = { commit, path: file.split('/').map(encodeURIComponent).join('/'), start_line: span.start_line, end_line: span.end_line };
      const url = new URL(template.replace(/\{([^{}]+)\}/g, (_, token) => values[token]));
      if (url.username || url.password) throw new Error('API source URL must not contain credentials');
      result[row.id] = url.href;
    }
  }
  return result;
}
