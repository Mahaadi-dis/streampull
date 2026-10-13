import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'

/** Tiny JSON-file store: sync load, debounced atomic save. */
export class JsonStore<T> {
  private file: string
  private timer: NodeJS.Timeout | null = null
  data: T

  constructor(name: string, defaults: T) {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.file = join(dir, `${name}.json`)
    this.data = defaults
    try {
      if (existsSync(this.file)) {
        const parsed = JSON.parse(readFileSync(this.file, 'utf8'))
        this.data = Array.isArray(defaults)
          ? (parsed as T)
          : ({ ...defaults, ...parsed } as T)
      }
    } catch {
      /* corrupt file → fall back to defaults */
    }
  }

  save(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flush(), 300)
  }

  flush(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    const tmp = this.file + '.tmp'
    writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8')
    renameSync(tmp, this.file)
  }
}
