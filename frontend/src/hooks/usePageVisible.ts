import { useEffect, useState } from 'react'

// Pauses background canvases when the browser tab itself is backgrounded — cheap,
// and worth combining with useInView for anything running a continuous RAF loop.
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(!document.hidden)

  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
