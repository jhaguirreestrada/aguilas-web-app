import { SettingsRepository } from './settings.repository'
import { settingsSchema } from './settings.dto'
import type { Settings } from '@/shared/types'

export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  get(): Promise<Settings> {
    return this.repo.get()
  }

  async update(input: unknown): Promise<Settings> {
    const s = settingsSchema.parse(input) as Settings
    // Las categorías de peso se evalúan por rango: se guardan ordenadas por peso mínimo.
    s.weight_categories_female.sort((a, b) => a.min_kg - b.min_kg)
    s.weight_categories_male.sort((a, b) => a.min_kg - b.min_kg)
    await this.repo.replace(s)
    return this.repo.get()
  }
}
