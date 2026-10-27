import { ArrowUpRight, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProductListItem } from '../lib/types'
import { productTypeLabel } from '../lib/format'
import { ProductImage } from './ProductImage'
import { AvailabilityBadge } from './StatusBadge'

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      to={`/producto/${product.slug}`}
      className="group card-hover flex h-full flex-col overflow-hidden rounded-3xl border border-sand-200 bg-white"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-sand-100">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="transition duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3">
          <AvailabilityBadge available={product.available} />
        </div>
        {product.featured && (
          <div className="absolute right-3 top-3 rounded-full bg-ink/70 p-1.5 text-brand-300 backdrop-blur">
            <Star className="h-3.5 w-3.5 fill-current" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
            {product.family?.name ?? productTypeLabel(product.product_type)}
          </span>
          <span className="text-[11px] font-medium text-ink-muted">
            {productTypeLabel(product.product_type)}
          </span>
        </div>

        <h3 className="mt-2 text-2xl leading-tight text-ink">{product.name}</h3>
        {product.brand && <p className="mt-1 text-xs text-ink-muted">{product.brand}</p>}

        {product.short_description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-muted">
            {product.short_description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {product.available_volumes.length > 0 ? (
            product.available_volumes.map((volume) => (
              <span
                key={volume}
                className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-semibold text-ink-muted"
              >
                {volume} ml
              </span>
            ))
          ) : (
            <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
              Sin presentaciones disponibles
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted group-hover:text-brand-700">
            Ver detalles
          </span>
          <span className="rounded-full border border-sand-200 p-2 text-ink-muted transition group-hover:border-brand-300 group-hover:bg-brand-50 group-hover:text-brand-700">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}
