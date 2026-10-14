/** Parse "v1.2.3" / "1.2.3-beta.1" into its numeric parts and whether it is a pre-release. */
function parse(v: string): { nums: number[]; pre: boolean } | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(v.trim())
  if (!m) return null
  return { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: /^v?\d+\.\d+\.\d+-/.test(v.trim()) }
}

/** True when `latest` is a newer release than `current`. Unparseable versions are never "newer". */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = parse(latest)
  const b = parse(current)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a.nums[i] !== b.nums[i]) return a.nums[i] > b.nums[i]
  }
  return !a.pre && b.pre // 1.0.0 is newer than 1.0.0-beta
}
