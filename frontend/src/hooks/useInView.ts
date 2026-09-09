import { useEffect, useState, type RefObject } from 'react'

export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = '200px 0px',
  threshold = 0,
): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin,
      threshold,
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, rootMargin, threshold])

  return inView
}
