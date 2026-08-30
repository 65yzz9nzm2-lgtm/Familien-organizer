import { lazy, type ComponentType } from 'react'

const RELOAD_FLAG = 'familyhub-chunk-reload'

/**
 * Wraps React.lazy() so that a failed dynamic import (typically: the
 * browser has an old index.html/service worker cached, but the JS chunk it
 * points at was removed by a newer deployment) triggers one full page
 * reload instead of leaving the user on a permanently blank screen. The
 * reload fetches the current index.html with correct chunk hashes. Guarded
 * by sessionStorage so a genuinely broken build can't reload-loop forever.
 */
export function lazyWithReload<T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const loaded = await factory()
      sessionStorage.removeItem(RELOAD_FLAG)
      return loaded
    } catch (error) {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        window.location.reload()
      }
      throw error
    }
  })
}
