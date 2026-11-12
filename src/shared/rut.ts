/** RUT chileno: limpieza, dígito verificador, validación y formato. */

export const cleanRut = (s: string | null | undefined): string => String(s ?? '').replace(/[^0-9kK]/g, '').toUpperCase()

export function rutDv(body: string): string {
  let sum = 0
  let mul = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const r = 11 - (sum % 11)
  return r === 11 ? '0' : r === 10 ? 'K' : String(r)
}

export function validRut(s: string): boolean {
  const c = cleanRut(s)
  return c.length >= 8 && c.length <= 9 && rutDv(c.slice(0, -1)) === c.slice(-1)
}

export function formatRut(s: string): string {
  const c = cleanRut(s)
  if (c.length < 2) return c
  return c.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + c.slice(-1)
}
