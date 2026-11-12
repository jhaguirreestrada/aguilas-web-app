import { describe, expect, it } from 'vitest'
import { addMonths, todayIso } from '../dates'
import { cleanRut, formatRut, rutDv, validRut } from '../rut'
import { lastPayment, paymentStatus, planDueDate } from './payments'
import { ageOf, weightCategoryOf } from './students'

describe('rut', () => {
  it('calcula el dígito verificador', () => {
    expect(rutDv('12345678')).toBe('5')
    expect(validRut('12.345.678-5')).toBe(true)
    expect(validRut('12.345.678-9')).toBe(false)
    expect(validRut('22.000.854-1')).toBe(true) // dato real migrado
  })
  it('formatea y limpia', () => {
    expect(formatRut('123456785')).toBe('12.345.678-5')
    expect(cleanRut('18.345.678-k')).toBe('18345678K')
  })
})

describe('fechas y vencimientos', () => {
  it('addMonths respeta fin de mes', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-09-15', 3)).toBe('2026-12-15')
  })
  it('plan diario vale N días contando el día de pago', () => {
    expect(planDueDate('2026-11-04', { unit: 'days', quantity: 1 })).toBe('2026-11-04')
    expect(planDueDate('2026-11-04', { unit: 'days', quantity: 3 })).toBe('2026-11-06')
    expect(planDueDate('2026-11-04', { unit: 'months', quantity: 1 })).toBe('2026-12-04')
  })
  it('todayIso usa la zona horaria pedida', () => {
    const d = new Date('2026-11-05T01:30:00Z') // en Santiago aún es 4-nov (UTC-3 en verano)
    expect(todayIso('America/Santiago', d)).toBe('2026-11-04')
    expect(todayIso('UTC', d)).toBe('2026-11-05')
  })
})

describe('estado de pago', () => {
  const today = '2026-11-10'
  it('sin pagos', () => expect(paymentStatus(null, 5, today).key).toBe('NONE'))
  it('vencido', () => {
    const s = paymentStatus({ due_date: '2026-11-05' }, 5, today)
    expect(s.key).toBe('OVERDUE')
    expect(s.days_overdue).toBe(5)
  })
  it('por vencer / vigente', () => {
    expect(paymentStatus({ due_date: '2026-11-15' }, 5, today).key).toBe('DUE_SOON')
    expect(paymentStatus({ due_date: '2026-11-16' }, 5, today).key).toBe('CURRENT')
  })
  it('el último pago es el que llega más lejos', () => {
    const mensual = { due_date: '2026-12-01', paid_on: '2026-11-01', created_at: 'a' }
    const diario = { due_date: '2026-11-05', paid_on: '2026-11-05', created_at: 'b' }
    expect(lastPayment([diario, mensual])).toBe(mensual)
  })
})

describe('alumnos', () => {
  it('edad', () => {
    expect(ageOf('2000-11-11', '2026-11-10')).toBe(25)
    expect(ageOf('2000-11-10', '2026-11-10')).toBe(26)
    expect(ageOf(null, '2026-11-10')).toBeNull()
  })
  it('categoría de peso', () => {
    const male = [
      { name: 'Mínimo', min_kg: 0, max_kg: 48 },
      { name: 'Ligero', min_kg: 57.01, max_kg: 60 },
      { name: 'Mosca', min_kg: 51.01, max_kg: 54 },
    ]
    expect(weightCategoryOf('M', 58, [], male)).toBe('Ligero')
    expect(weightCategoryOf('M', 40, [], male)).toBe('Mínimo')
    expect(weightCategoryOf(null, 58, [], male)).toBe('')
  })
})
