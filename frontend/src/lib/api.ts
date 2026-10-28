import type {
  Dashboard,
  Family,
  FamilyInput,
  ImageAdmin,
  Movement,
  MovementInput,
  Note,
  NoteInput,
  Paginated,
  PresentationOption,
  ProductAdmin,
  ProductAdminListItem,
  ProductDetail,
  ProductInput,
  ProductListItem,
  PublicConfig,
  ReportSummary,
  Supply,
  SupplyInput,
  User,
} from './types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type QueryValue = string | number | boolean | undefined | null

function queryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const result = search.toString()
  return result ? `?${result}` : ''
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!(init?.body instanceof FormData) && init?.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
    headers,
  })

  if (!response.ok) {
    let detail = 'Ocurrió un error inesperado'
    try {
      const data = await response.json()
      if (typeof data.detail === 'string') {
        detail = data.detail
      } else if (Array.isArray(data.detail)) {
        detail = data.detail
          .map((item: { msg?: string }) => item.msg ?? 'Dato inválido')
          .join('. ')
      }
    } catch {
      detail = response.statusText || detail
    }
    throw new ApiError(detail, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export interface ProductQuery {
  q?: string
  familia?: string
  tipo?: string
  nota?: string
  disponible?: boolean
  destacado?: boolean
  page?: number
  page_size?: number
  sort?: 'recientes' | 'nombre'
}

export const api = {
  config: () => request<PublicConfig>('/config'),
  families: () => request<Family[]>('/familias'),
  notes: () => request<Note[]>('/notas'),
  products: (params: ProductQuery = {}) =>
    request<Paginated<ProductListItem>>(`/productos${queryString(params as Record<string, QueryValue>)}`),
  product: (slug: string) => request<ProductDetail>(`/productos/${encodeURIComponent(slug)}`),

  auth: {
    login: (email: string, password: string) =>
      request<User>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
    me: () => request<User>('/auth/me'),
  },

  admin: {
    dashboard: () => request<Dashboard>('/admin/dashboard'),

    products: (params: {
      q?: string
      estado?: string
      familia?: string
      page?: number
      page_size?: number
    } = {}) =>
      request<Paginated<ProductAdminListItem>>(
        `/admin/productos${queryString(params as Record<string, QueryValue>)}`,
      ),
    product: (id: number) => request<ProductAdmin>(`/admin/productos/${id}`),
    createProduct: (data: ProductInput) =>
      request<ProductAdmin>('/admin/productos', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateProduct: (id: number, data: ProductInput) =>
      request<ProductAdmin>(`/admin/productos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deactivateProduct: (id: number) =>
      request<{ message: string }>(`/admin/productos/${id}`, { method: 'DELETE' }),
    activateProduct: (id: number) =>
      request<{ message: string }>(`/admin/productos/${id}/activar`, { method: 'POST' }),
    uploadImage: (productId: number, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return request<ImageAdmin>(`/admin/productos/${productId}/imagenes`, {
        method: 'POST',
        body: formData,
      })
    },
    deleteImage: (productId: number, imageId: number) =>
      request<{ message: string }>(`/admin/productos/${productId}/imagenes/${imageId}`, {
        method: 'DELETE',
      }),
    presentationOptions: (q?: string) =>
      request<PresentationOption[]>(`/admin/productos/presentaciones/opciones${queryString({ q })}`),

    supplies: (params: {
      q?: string
      categoria?: string
      stock_bajo?: boolean
      activo?: boolean
    } = {}) =>
      request<Supply[]>(`/admin/insumos${queryString(params as Record<string, QueryValue>)}`),
    createSupply: (data: SupplyInput) =>
      request<Supply>('/admin/insumos', { method: 'POST', body: JSON.stringify(data) }),
    updateSupply: (id: number, data: SupplyInput) =>
      request<Supply>(`/admin/insumos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deactivateSupply: (id: number) =>
      request<{ message: string }>(`/admin/insumos/${id}`, { method: 'DELETE' }),

    movements: (params: {
      item_type?: string
      movement_type?: string
      page?: number
      page_size?: number
    } = {}) =>
      request<Paginated<Movement>>(
        `/admin/movimientos${queryString(params as Record<string, QueryValue>)}`,
      ),
    createMovement: (data: MovementInput) =>
      request<Movement>('/admin/movimientos', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    families: () => request<Family[]>('/admin/familias'),
    createFamily: (data: FamilyInput) =>
      request<Family>('/admin/familias', { method: 'POST', body: JSON.stringify(data) }),
    updateFamily: (id: number, data: FamilyInput) =>
      request<Family>(`/admin/familias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteFamily: (id: number) =>
      request<{ message: string }>(`/admin/familias/${id}`, { method: 'DELETE' }),

    notes: () => request<Note[]>('/admin/notas'),
    createNote: (data: NoteInput) =>
      request<Note>('/admin/notas', { method: 'POST', body: JSON.stringify(data) }),
    updateNote: (id: number, data: NoteInput) =>
      request<Note>(`/admin/notas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteNote: (id: number) =>
      request<{ message: string }>(`/admin/notas/${id}`, { method: 'DELETE' }),

    reportSummary: () => request<ReportSummary>('/admin/reportes/resumen'),
    exportUrl: (tipo: 'inventario' | 'agotados' | 'stock_bajo') =>
      `/api/admin/reportes/export?tipo=${tipo}`,

    settings: () => request<PublicConfig>('/admin/configuracion'),
    updateSettings: (data: Partial<PublicConfig>) =>
      request<PublicConfig>('/admin/configuracion', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
}
