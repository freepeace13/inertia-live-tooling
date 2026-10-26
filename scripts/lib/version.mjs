const PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/;

export function parse(version) {
  const m = PATTERN.exec(version);
  if (!m) throw new Error(`Invalid version "${version}" (expected x.y.z or x.y.z-rc.n)`);
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    rc: m[4] === undefined ? null : Number(m[4]),
  };
}

export function format({ major, minor, patch, rc }) {
  return `${major}.${minor}.${patch}${rc === null ? '' : `-rc.${rc}`}`;
}

export function line(version) {
  const { major, minor } = parse(version);
  return `${major}.${minor}`;
}

// Semver precedence: a prerelease sorts below its release.
function compare(a, b) {
  for (const k of ['major', 'minor', 'patch']) {
    if (a[k] !== b[k]) return a[k] - b[k];
  }
  if (a.rc === b.rc) return 0;
  if (a.rc === null) return 1;
  if (b.rc === null) return -1;
  return a.rc - b.rc;
}

export function bump(current, kind) {
  const cur = parse(current);
  const pre = cur.rc !== null;
  let next;

  if (/^\d/.test(kind)) {
    next = parse(kind);
  } else if (kind === 'patch') {
    next = { ...cur, patch: pre ? cur.patch : cur.patch + 1, rc: null };
  } else if (kind === 'minor') {
    const graduate = pre && cur.patch === 0;
    next = { major: cur.major, minor: graduate ? cur.minor : cur.minor + 1, patch: 0, rc: null };
  } else if (kind === 'major') {
    const graduate = pre && cur.minor === 0 && cur.patch === 0;
    next = { major: graduate ? cur.major : cur.major + 1, minor: 0, patch: 0, rc: null };
  } else if (kind === 'rc') {
    next = pre ? { ...cur, rc: cur.rc + 1 } : { major: cur.major, minor: cur.minor + 1, patch: 0, rc: 1 };
  } else {
    throw new Error(`Unknown bump "${kind}" (use patch, minor, major, rc or an explicit version)`);
  }

  if (compare(next, cur) <= 0) throw new Error(`Version ${format(next)} is not higher than ${current}`);
  return format(next);
}

// release/M.N allows only stable versions inside M.N; release/M.x stays inside major M.
export function assertBranchAllows(branch, from, to) {
  const m = /^release\/(\d+)\.(\d+|x)$/.exec(branch);
  if (!m) return;
  const inLine = (v) => {
    const p = parse(v);
    return p.major === Number(m[1]) && (m[2] === 'x' || p.minor === Number(m[2]));
  };
  if (!inLine(from)) throw new Error(`Current version ${from} is not on the ${branch} line`);
  if (!inLine(to)) throw new Error(`${branch} only allows releases inside its line; ${to} is outside it`);
  if (parse(to).rc !== null) throw new Error(`${branch} only allows stable releases, not ${to}`);
}
