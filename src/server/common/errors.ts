/** Error de negocio con código HTTP. Los mensajes son seguros de mostrar al usuario. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const badRequest = (msg: string, code?: string) => new AppError(400, msg, code)
export const unauthorized = (msg = 'No autenticado', code = 'UNAUTHENTICATED') => new AppError(401, msg, code)
export const forbidden = (msg = 'No tienes permisos para esta acción', code = 'FORBIDDEN') => new AppError(403, msg, code)
export const notFound = (msg = 'Registro no encontrado') => new AppError(404, msg, 'NOT_FOUND')
export const conflict = (msg: string, code = 'CONFLICT') => new AppError(409, msg, code)
