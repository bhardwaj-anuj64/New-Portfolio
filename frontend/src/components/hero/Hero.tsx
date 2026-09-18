import { motion } from 'framer-motion'
import { useState } from 'react'
import { recordResumeDownload } from '../../services/api'
import { SocialLink } from '../common/SocialLink'
import { HeroCanvasBackground } from './HeroCanvasBackground'
import { RoleBadge } from './RoleBadge'

const TITLE_SHADOW = { textShadow: '0 2px 20px rgb(0 0 0 / 0.8)' }

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function ProfileRing() {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="relative h-28 w-28">
      <motion.div
        className="absolute inset-0 rounded-full bg-violet-500/40 blur-lg"
        animate={{ opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative h-full w-full overflow-hidden rounded-full border border-white/20 bg-white/5 backdrop-blur-md">
        {imgError ? (
          <div className="flex h-full w-full items-center justify-center font-mono text-2xl text-white/70">
            AB
          </div>
        ) : (
          <img
            src="/profile.webp"
            alt="Anuj Bhardwaj"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    </div>
  )
}

function F1ScrollIndicator() {
  return (
    <motion.button
      onClick={() => scrollTo('professional')}
      aria-label="Scroll to next section"
      className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 transition-colors hover:text-white"
      animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 32 48" className="h-10 w-7" fill="currentColor" aria-hidden="true">
        <rect x="4" y="0" width="24" height="3" rx="1" />
        <rect x="2" y="18" width="4" height="9" rx="1" />
        <rect x="26" y="18" width="4" height="9" rx="1" />
        <path d="M16 46 L20 34 L24 22 L21 10 L26 3 L6 3 L11 10 L8 22 L12 34 Z" />
      </svg>
    </motion.button>
  )
}

export function Hero() {
  return (
    <section
      id="hero"
      className="relative isolate flex min-h-svh snap-start flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <HeroCanvasBackground />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(10,10,15,0.88)_100%)]" />

      <div className="pointer-events-none relative z-10 flex flex-col items-center gap-6">
        <div className="pointer-events-auto">
          <ProfileRing />
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={TITLE_SHADOW}
          className="text-5xl font-semibold tracking-tight text-white sm:text-6xl"
        >
          Anuj Bhardwaj
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <RoleBadge />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={TITLE_SHADOW}
          className="max-w-xl text-balance text-white/70"
        >
          Jack of all trades, master of none, but oftentimes better than a master
          of one.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="pointer-events-auto flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={() => scrollTo('professional')}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Explore Work
          </button>
          <button
            onClick={() => scrollTo('contact')}
            className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/10"
          >
            Contact
          </button>
          {/* Drop a real file at public/resume.pdf — see LAUNCH_CHECKLIST.md */}
          <a
            href="/resume.pdf"
            download
            onClick={() => recordResumeDownload()}
            className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/10"
          >
            Resume
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="pointer-events-auto flex items-center gap-3"
        >
          <SocialLink href="https://github.com/bhardwaj-anuj64" label="GitHub" iconId="github-icon" />
          <SocialLink href="https://www.instagram.com/anuj.bhardwaj64" label="Instagram" iconId="instagram-icon" />
        </motion.div>
      </div>

      <F1ScrollIndicator />
    </section>
  )
}
