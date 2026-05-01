import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export type PaginationParams = z.infer<typeof paginationSchema>

export function paginate(params: PaginationParams) {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  }
}

export function paginatedResponse<T>(data: T[], total: number, params: PaginationParams) {
  return {
    data,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit),
    },
  }
}
