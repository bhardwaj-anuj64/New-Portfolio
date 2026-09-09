import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NAV_ITEMS } from './navItems'
import type { NavItem } from '../../types'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeId, setActiveId] = useState('hero')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const ids = Array.from(new Set(NAV_ITEMS.map((item) => item.id)))
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    // A thin band near the vertical center of the viewport decides "active" — steadier
    // than firing on any intersection, which flickers between adjacent tall sections.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible) setActiveId(visible.target.id)
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  function goTo(item: NavItem) {
    setMobileOpen(false)
    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function isActive(item: NavItem) {
    return item.id === activeId
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? 'border-b border-white/10 bg-[#0a0a0f]/70 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <button
          onClick={() => goTo(NAV_ITEMS[0])}
          className="font-mono text-sm font-medium text-white"
        >
          AB
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => goTo(item)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive(item) ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setMobileOpen((open) => !open)}
          className="text-white/80 md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => goTo(item)}
                  className={`rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                    isActive(item) ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
