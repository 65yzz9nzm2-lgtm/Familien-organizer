import { describe, expect, it } from 'vitest'
import { compressImageIfNeeded } from './image-compression'

// Actual resizing needs canvas/createImageBitmap, which jsdom doesn't
// implement - that path is exercised manually in the browser. This test
// covers the guard clause that must never touch the canvas API: non-image
// files (PDFs, the other common upload) have to pass through untouched.
describe('compressImageIfNeeded', () => {
  it('returns non-image files unchanged', async () => {
    const pdf = new File(['%PDF-1.4 fake content'], 'rechnung.pdf', { type: 'application/pdf' })
    const result = await compressImageIfNeeded(pdf)
    expect(result).toBe(pdf)
  })

  it('leaves SVGs unchanged (vector, not worth rasterizing)', async () => {
    const svg = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' })
    const result = await compressImageIfNeeded(svg)
    expect(result).toBe(svg)
  })
})
