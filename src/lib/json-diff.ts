/**
 * Diff utility for comparing two JSON-like values (audit log "before"/"after"
 * snapshots) and rendering a git-style, line-highlighted representation of
 * each side that matches `JSON.stringify(value, null, 2)` byte-for-byte.
 */

export type DiffStatus = 'added' | 'removed' | 'changed' | 'unchanged'
export type DiffSide = 'before' | 'after'
export type LineStatus = DiffStatus | 'descendant'

export interface JsonLine {
  /** The fully formatted line, including indentation and trailing comma. */
  text: string
  /** Dotted/bracket path this line represents; null for closing lines ("}", "],"). */
  path: string | null
  /** True for lines that open an object/array container (e.g. `"perfil": {`). */
  isContainer: boolean
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function childPath(basePath: string, key: string | number): string {
  if (typeof key === 'number') return `${basePath}[${key}]`
  return basePath ? `${basePath}.${key}` : key
}

/**
 * Flattens a JSON value into a map of leaf-path -> leaf-value.
 * Empty objects/arrays are treated as leaves themselves so that, e.g.,
 * `{ perfil: {} }` vs `{}` is still detected as a change on `perfil`.
 */
export function flattenJson(value: unknown, basePath = '', out: Map<string, unknown> = new Map()): Map<string, unknown> {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.set(basePath || '', value)
      return out
    }
    value.forEach((item, index) => flattenJson(item, childPath(basePath, index), out))
    return out
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 0) {
      out.set(basePath || '', value)
      return out
    }
    keys.forEach((key) => flattenJson(value[key], childPath(basePath, key), out))
    return out
  }

  // Primitive (string, number, boolean, null, undefined) at this path.
  out.set(basePath || '', value)
  return out
}

/**
 * Compares two JSON values by leaf path and classifies every path present
 * in either side as added, removed, changed, or unchanged.
 */
export function diffJson(before: unknown, after: unknown): Map<string, DiffStatus> {
  const beforeLeaves = flattenJson(before ?? null)
  const afterLeaves = flattenJson(after ?? null)
  const result = new Map<string, DiffStatus>()

  const allPaths = new Set<string>(Array.from(beforeLeaves.keys()).concat(Array.from(afterLeaves.keys())))

  allPaths.forEach((path) => {
    const hasBefore = beforeLeaves.has(path)
    const hasAfter = afterLeaves.has(path)

    if (hasBefore && !hasAfter) {
      result.set(path, 'removed')
      return
    }
    if (!hasBefore && hasAfter) {
      result.set(path, 'added')
      return
    }

    const beforeValue = beforeLeaves.get(path)
    const afterValue = afterLeaves.get(path)
    const same = JSON.stringify(beforeValue) === JSON.stringify(afterValue)
    result.set(path, same ? 'unchanged' : 'changed')
  })

  return result
}

/**
 * Pretty-prints a JSON value the same way `JSON.stringify(value, null, 2)`
 * does, but as an array of lines, each annotated with the path it represents.
 */
export function serializeWithPaths(value: unknown): JsonLine[] {
  const lines: JsonLine[] = []

  function emitScalar(prefix: string, val: unknown, path: string | null, suffix: string) {
    lines.push({ text: `${prefix}${JSON.stringify(val)}${suffix}`, path, isContainer: false })
  }

  function walk(val: unknown, indent: string, keyPrefix: string, path: string, suffix: string) {
    if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push({ text: `${indent}${keyPrefix}[]${suffix}`, path, isContainer: false })
        return
      }
      lines.push({ text: `${indent}${keyPrefix}[`, path, isContainer: true })
      const childIndent = `${indent}  `
      val.forEach((item, index) => {
        const isLast = index === val.length - 1
        const itemPath = childPath(path, index)
        walk(item, childIndent, '', itemPath, isLast ? '' : ',')
      })
      lines.push({ text: `${indent}]${suffix}`, path: null, isContainer: false })
      return
    }

    if (isPlainObject(val)) {
      const keys = Object.keys(val)
      if (keys.length === 0) {
        lines.push({ text: `${indent}${keyPrefix}{}${suffix}`, path, isContainer: false })
        return
      }
      lines.push({ text: `${indent}${keyPrefix}{`, path, isContainer: true })
      const childIndent = `${indent}  `
      keys.forEach((key, index) => {
        const isLast = index === keys.length - 1
        const childKeyPrefix = `${JSON.stringify(key)}: `
        const itemPath = childPath(path, key)
        walk(val[key], childIndent, childKeyPrefix, itemPath, isLast ? '' : ',')
      })
      lines.push({ text: `${indent}}${suffix}`, path: null, isContainer: false })
      return
    }

    emitScalar(`${indent}${keyPrefix}`, val, path, suffix)
  }

  walk(value, '', '', '', '')
  return lines
}

/**
 * Resolves the visual status of a single serialized line:
 * - closing lines ("}", "],") have no path -> unchanged
 * - leaf lines take the status of their own path
 * - container lines take their own status if added/removed, otherwise
 *   'descendant' if any change lives underneath them, otherwise unchanged
 */
export function resolveLineStatus(line: JsonLine, diff: Map<string, DiffStatus>): LineStatus {
  if (line.path === null) return 'unchanged'

  const ownStatus = diff.get(line.path)

  if (line.isContainer) {
    if (ownStatus === 'added' || ownStatus === 'removed') return ownStatus
    const childPrefixDot = `${line.path}.`
    const childPrefixBracket = `${line.path}[`
    const hasChangedDescendant = Array.from(diff.entries()).some(
      ([path, status]) => status !== 'unchanged' && (path.startsWith(childPrefixDot) || path.startsWith(childPrefixBracket))
    )
    return hasChangedDescendant ? 'descendant' : 'unchanged'
  }

  return ownStatus ?? 'unchanged'
}

/** Counts how many leaf paths differ between before/after (added/removed/changed). */
export function countChanges(diff: Map<string, DiffStatus>): number {
  let count = 0
  diff.forEach((status) => {
    if (status !== 'unchanged') count += 1
  })
  return count
}
