export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const unauthorized = (msg = 'No autorizado') => new AppError(401, msg, 'UNAUTHORIZED')
export const forbidden = (msg = 'Acceso denegado') => new AppError(403, msg, 'FORBIDDEN')
export const notFound = (entity = 'Recurso') => new AppError(404, `${entity} no encontrado`, 'NOT_FOUND')
export const conflict = (msg: string) => new AppError(409, msg, 'CONFLICT')
export const badRequest = (msg: string) => new AppError(400, msg, 'BAD_REQUEST')
