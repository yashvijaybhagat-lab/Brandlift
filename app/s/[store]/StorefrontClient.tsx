'use client'
import { useState } from 'react'
import { ShoppingCart, Plus, Minus, X, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import type { DatabaseTables } from '@/lib/supabase'

type Store = DatabaseTables['stores']['Row']
type Product = DatabaseTables['products']['Row']

interface CartItem {
  product: Product
  quantity: number
}

interface Props {
  store: Store
  products: Product[]
}

const THEME_CONFIG: Record<string, { bg: string; surface: string; accent: string; text: string; muted: string }> = {
  minimal: { bg: '#FAFAFA', surface: '#FFFFFF', accent: '#111111', text: '#111111', muted: '#71717A' },
  bold:    { bg: '#0D0D0F', surface: '#1a1a1a', accent: '#F97316', text: '#FAFAFA', muted: '#71717A' },
  luxury:  { bg: '#0a0a08', surface: '#141410', accent: '#F0C45E', text: '#F5F0E8', muted: '#8A8070' },
  tech:    { bg: '#040810', surface: '#080f1a', accent: '#5B9EFF', text: '#E0EEFF', muted: '#4a6080' },
}

export function StorefrontClient({ store, products }: Props) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  const theme = THEME_CONFIG[store.theme] ?? THEME_CONFIG.minimal
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((i) => {
        if (i.product.id !== productId) return [i]
        const newQty = i.quantity + delta
        return newQty <= 0 ? [] : [{ ...i, quantity: newQty }]
      })
    )
  }

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-4"
        style={{ background: theme.surface + 'ee', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${theme.accent}22` }}
      >
        <div className="flex items-center gap-2">
          {store.logo_url ? (
            <Image src={store.logo_url} alt={store.name} width={32} height={32} className="rounded-lg" />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold"
              style={{ background: theme.accent, color: theme.bg }}
            >
              {store.name.charAt(0)}
            </div>
          )}
          <span className="font-bold text-[17px]" style={{ letterSpacing: '-0.03em' }}>{store.name}</span>
        </div>

        <button
          onClick={() => setCartOpen(true)}
          className="relative p-2.5 rounded-xl transition-all duration-150"
          style={{ background: theme.accent + '15', border: `1px solid ${theme.accent}30` }}
        >
          <ShoppingCart className="w-5 h-5" style={{ color: theme.accent }} />
          {totalItems > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center"
              style={{ background: theme.accent, color: theme.bg }}
            >
              {totalItems}
            </span>
          )}
        </button>
      </nav>

      {/* Hero */}
      <section className="py-20 px-6 text-center max-w-3xl mx-auto">
        <h1 className="text-[52px] font-extrabold mb-4" style={{ letterSpacing: '-0.04em' }}>{store.name}</h1>
        {store.description && (
          <p className="text-[17px] leading-relaxed" style={{ color: theme.muted }}>{store.description}</p>
        )}
      </section>

      {/* Products */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: theme.muted }}>No products available yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: theme.surface, border: `1px solid ${theme.accent}15` }}
              >
                {/* Product image */}
                <div
                  className="h-56 flex items-center justify-center"
                  style={{ background: theme.accent + '10' }}
                >
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} width={300} height={224} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-[40px]">📦</div>
                  )}
                </div>

                {/* Product info */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div>
                    <h3 className="text-[16px] font-semibold">{product.name}</h3>
                    {product.description && (
                      <p className="text-[13px] mt-1 line-clamp-2" style={{ color: theme.muted }}>{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className="text-[18px] font-extrabold" style={{ letterSpacing: '-0.03em' }}>
                      ${product.price.toFixed(2)}
                    </span>
                    {product.compare_at_price && (
                      <span className="text-[13px] line-through" style={{ color: theme.muted }}>
                        ${product.compare_at_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => addToCart(product)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 hover:opacity-85"
                    style={{ background: theme.accent, color: theme.bg }}
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 text-center border-t" style={{ borderColor: theme.accent + '15' }}>
        <p className="text-[12px]" style={{ color: theme.muted }}>
          Powered by{' '}
          <a href="https://brandlift.app" className="underline" style={{ color: theme.accent }}>BrandLift</a>
        </p>
      </footer>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md flex flex-col"
            style={{ background: theme.surface }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.accent + '20' }}>
              <h2 className="text-[18px] font-bold">Cart ({totalItems})</h2>
              <button onClick={() => setCartOpen(false)} className="p-2 rounded-xl" style={{ background: theme.accent + '15' }}>
                <X className="w-4 h-4" style={{ color: theme.accent }} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {cart.length === 0 ? (
                <p className="text-center py-12 text-[14px]" style={{ color: theme.muted }}>Your cart is empty.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: theme.bg }}>
                    <div className="w-12 h-12 rounded-lg flex-shrink-0" style={{ background: theme.accent + '15' }}>
                      {item.product.images[0] && <Image src={item.product.images[0]} alt={item.product.name} width={48} height={48} className="w-full h-full object-cover rounded-lg" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate">{item.product.name}</p>
                      <p className="text-[13px]" style={{ color: theme.muted }}>${item.product.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: theme.accent + '20' }}>
                        <Minus className="w-3 h-3" style={{ color: theme.accent }} />
                      </button>
                      <span className="text-[14px] font-medium w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: theme.accent + '20' }}>
                        <Plus className="w-3 h-3" style={{ color: theme.accent }} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkout */}
            {cart.length > 0 && (
              <div className="p-6 border-t" style={{ borderColor: theme.accent + '20' }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[14px]" style={{ color: theme.muted }}>Total</span>
                  <span className="text-[20px] font-extrabold">${totalPrice.toFixed(2)}</span>
                </div>
                <button
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold transition-all duration-150 hover:opacity-90"
                  style={{ background: theme.accent, color: theme.bg }}
                >
                  Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
