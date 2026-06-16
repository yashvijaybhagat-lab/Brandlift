import { renderBrandOgImage, ogAlt, ogSize, ogContentType } from '@/lib/og'

export const alt = ogAlt
export const size = ogSize
export const contentType = ogContentType

export default function TwitterImage() {
  return renderBrandOgImage()
}
