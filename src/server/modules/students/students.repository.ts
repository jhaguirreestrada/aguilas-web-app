import type { Db } from '@/server/db/client'
import { unwrap } from '@/server/db/client'
import type { Student, WeightEntry } from '@/shared/types'

export type StudentRow = Omit<Student, 'id' | 'created_at' | 'updated_at'>

export class StudentsRepository {
  constructor(private readonly db: Db) {}

  async listAll(): Promise<Student[]> {
    return unwrap(await this.db.from('students').select('*').order('last_names')) as Student[]
  }

  async findById(id: string): Promise<Student | null> {
    return unwrap(await this.db.from('students').select('*').eq('id', id).maybeSingle()) as Student | null
  }

  async findByRut(formattedRut: string): Promise<Student | null> {
    return unwrap(await this.db.from('students').select('*').eq('rut', formattedRut).maybeSingle()) as Student | null
  }

  async insert(row: StudentRow): Promise<Student> {
    return unwrap(await this.db.from('students').insert(row).select('*').single(), {
      duplicate: 'Ya existe un alumno con ese RUT',
    }) as Student
  }

  async update(id: string, row: Partial<StudentRow>): Promise<Student> {
    return unwrap(await this.db.from('students').update(row).eq('id', id).select('*').single(), {
      duplicate: 'Ya existe un alumno con ese RUT',
    }) as Student
  }

  async remove(id: string): Promise<void> {
    unwrap(await this.db.from('students').delete().eq('id', id))
  }

  async weightHistory(studentId: string): Promise<WeightEntry[]> {
    return unwrap(
      await this.db
        .from('student_weight_history')
        .select('id,weight_kg,recorded_at')
        .eq('student_id', studentId)
        .order('recorded_at', { ascending: false }),
    ) as WeightEntry[]
  }

  async countWeightEntries(studentId: string): Promise<number> {
    const res = await this.db.from('student_weight_history').select('id', { count: 'exact', head: true }).eq('student_id', studentId)
    if (res.error) unwrap(res)
    return res.count ?? 0
  }

  async addWeight(studentId: string, weight: number, recordedAt?: string): Promise<void> {
    unwrap(
      await this.db.from('student_weight_history').insert({
        student_id: studentId,
        weight_kg: weight,
        ...(recordedAt ? { recorded_at: recordedAt } : {}),
      }),
    )
  }
}
