'use client'
import { ShoppingCart } from 'lucide-react'

export default function OrdersPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold text-[#FAFAFA] mb-1" style={{ letterSpacing: '-0.04em' }}>Orders</h1>
        <p className="text-[14px] text-[#71717A]">All customer orders across your stores.</p>
      </div>

      <div
        className="rounded-2xl p-16 flex flex-col items-center text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}
        >
          <ShoppingCart className="w-7 h-7 text-green-400" />
        </div>
        <h2 className="text-[18px] font-bold text-[#FAFAFA] mb-2">No orders yet</h2>
        <p className="text-[13px] text-[#52525B] max-w-xs">
          Orders will appear here once customers start purchasing from your stores.
        </p>
      </div>
    </div>
  )
}
