/** Requisitos mínimos de seguridad de contraseña (checklist del formulario de cambio de clave). */
const FORBIDDEN_SEQUENCES = [
  '1234567890', '0123456789', '0987654321', '9876543210',
  '123456789', '012345678', '12345678', '1234567', '123456',
  '12345', '1234', '123',
  'qwerty', 'qwertyuiop', 'asdf', 'asdfghjkl', 'zxcv', 'zxcvbnm',
  '1qaz', '2wsx', '3edc',
  'abc', 'xyz', 'bcd', 'cde',
]

const hasSequence = (p: string) => {
  const lower = p.toLowerCase()
  return FORBIDDEN_SEQUENCES.some((s) => lower.includes(s))
}

export const PASSWORD_CRITERIA = [
  { key: 'length', label: 'Longitud mínima 8 caracteres', test: (p: string) => p.length >= 8 },
  { key: 'chars', label: 'Debe poseer una mayúscula, minúscula y un número', test: (p: string) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) },
  { key: 'symbol', label: 'Debe poseer al menos un símbolo (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) },
  { key: 'pattern', label: 'Sin secuencia ni repeticiones', test: (p: string) => !hasSequence(p) && !/(.)\1{2,}/.test(p) },
]
