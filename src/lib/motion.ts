import { useEffect } from 'react'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Viewport height, or 0 when the environment reports nothing usable
 *  (a hidden or occluded tab, a headless capture, a zero-size embed). */
const viewportH = () => document.documentElement.clientHeight || window.innerHeight || 0

/**
 * Livery motion — the scroll half of the 1993 Williams treatment.
 *
 * Driven here rather than with CSS scroll timelines: the app's root is
 * height-constrained (html,body,#root{height:100%}), so scroll()/view() can't
 * resolve a scrollport against it.
 *
 * Both effects are no-ops under prefers-reduced-motion, and neither may assume
 * the first measurement it takes is usable: a hidden tab delivers no animation
 * frames and can report a zero client height, so both re-sync when the document
 * becomes visible or is resized.
 */
export function useLiveryMotion(routeKey: string) {
  // page scroll reads out along the livery bar under the topbar
  useEffect(() => {
    if (reduced()) return
    const de = document.documentElement
    let raf = 0

    const update = () => {
      raf = 0
      const max = de.scrollHeight - viewportH()
      const p = max > 8 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      de.style.setProperty('--scroll-progress', p.toFixed(4))
    }

    // A hidden document never delivers animation frames, so a plain rAF latch
    // would stick on and freeze the bar for the life of the page. Write through
    // directly instead, and re-sync on the way back to visible.
    const schedule = () => {
      if (document.hidden) {
        if (raf) { cancelAnimationFrame(raf); raf = 0 }
        update()
        return
      }
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    document.addEventListener('visibilitychange', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('visibilitychange', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // the page itself acknowledges a route change
  useEffect(() => {
    if (reduced()) return
    const el = document.querySelector<HTMLElement>('.content')
    if (!el) return
    // restart the animation: drop the class, force a reflow, re-add
    el.classList.remove('lv-route')
    void el.offsetWidth
    el.classList.add('lv-route')
    return () => el.classList.remove('lv-route')
  }, [routeKey])

  // sections rise as they come into view — only those that start below the
  // fold, so nothing already on screen flashes on route change
  useEffect(() => {
    if (reduced() || !('IntersectionObserver' in window)) return

    let io: IntersectionObserver | null = null
    let failsafe = 0
    const armed: HTMLElement[] = []

    const reveal = (el: HTMLElement) => {
      el.classList.remove('lv-hide')
      el.classList.add('lv-show')
    }

    const arm = () => {
      // A zero/absurd viewport means nothing can ever intersect — arming against
      // it would dim every section permanently. Wait for a real measurement.
      const vh = viewportH()
      if (vh < 200) return false
      const root = document.querySelector('.content')
      if (!root) return false

      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue
            reveal(e.target as HTMLElement)
            obs.unobserve(e.target)
          }
        },
        { rootMargin: '0px 0px -10% 0px' },
      )
      io = obs

      const targets = Array.from(
        root.querySelectorAll<HTMLElement>('.card, .overview-stats, .grid:not(.overview-stats) > .stat'),
      ).filter((el) => !el.closest('.overview-stats') || el.classList.contains('overview-stats'))

      for (const el of targets) {
        if (el.getBoundingClientRect().top <= vh * 0.92) continue // already on screen
        el.classList.add('lv-hide')
        obs.observe(el)
        armed.push(el)
      }
      // Last-resort failsafe: whatever happens, no section stays dimmed.
      failsafe = window.setTimeout(() => armed.forEach(reveal), 3000)
      return true
    }

    // Arming fails on a tab that is hidden or not yet laid out; retry when the
    // environment reports something we can actually measure against.
    let retry: (() => void) | null = null
    const detachRetry = () => {
      if (!retry) return
      window.removeEventListener('resize', retry)
      document.removeEventListener('visibilitychange', retry)
      retry = null
    }
    if (!arm()) {
      retry = () => { if (arm()) detachRetry() }
      window.addEventListener('resize', retry)
      document.addEventListener('visibilitychange', retry)
    }

    return () => {
      detachRetry()
      io?.disconnect()
      window.clearTimeout(failsafe)
      for (const el of armed) el.classList.remove('lv-hide', 'lv-show')
    }
  }, [routeKey])
}
