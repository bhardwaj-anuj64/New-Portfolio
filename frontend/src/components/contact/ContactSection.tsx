import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Loader2, Mail, Send, Terminal } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { submitContactForm } from '../../services/api'
import { FadeSection } from '../common/FadeSection'
import { SocialLink } from '../common/SocialLink'

const EMAIL = 'bhardwaj.anuj64@gmail.com'

type Status = 'idle' | 'submitting' | 'success' | 'error'

interface FieldErrors {
  name?: string
  email?: string
  message?: string
}

function validate(name: string, email: string, message: string): FieldErrors {
  const errors: FieldErrors = {}
  if (name.trim().length < 2) errors.name = 'Enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.'
  if (message.trim().length < 10) errors.message = 'Message should be at least 10 characters.'
  return errors
}

const inputClass = (invalid: boolean) =>
  `w-full rounded-lg border bg-white/5 px-3 py-2.5 pr-9 text-sm text-white outline-none transition-all placeholder:text-white/30 ${
    invalid
      ? 'border-red-400/60 focus:border-red-400'
      : 'border-white/10 focus:border-cyan-400/60 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.15)]'
  }`

function FieldShell({
  label,
  error,
  touched,
  children,
}: {
  label: string
  error?: string
  touched: boolean
  children: ReactNode
}) {
  const invalid = touched && !!error
  const valid = touched && !error

  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</span>
      <div className="relative">
        {children}
        {invalid && <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-red-400" />}
        {valid && <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-emerald-400" />}
      </div>
      {invalid && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}

export function ContactSection() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot — real users never see or fill this field
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<Status>('idle')

  const errors = validate(name, email, message)

  function markTouched(field: string) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ name: true, email: true, message: true })
    if (Object.keys(errors).length > 0) return

    setStatus('submitting')
    try {
      await submitContactForm({ name, email, message, website })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  function reset() {
    setName('')
    setEmail('')
    setMessage('')
    setTouched({})
    setStatus('idle')
  }

  return (
    <FadeSection id="contact" className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-6 py-16 text-center">
      <div>
        <h2 className="text-2xl font-semibold text-white">Contact</h2>
        <p className="mt-2 max-w-md text-white/60">Reach out directly, or dispatch a message below.</p>
      </div>

      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-md sm:p-8">
        <AnimatePresence mode="wait">
          {status === 'idle' ? (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <FieldShell label="Name" error={errors.name} touched={!!touched.name}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => markTouched('name')}
                  placeholder="Jane Doe"
                  className={inputClass(!!touched.name && !!errors.name)}
                />
              </FieldShell>

              <FieldShell label="Email" error={errors.email} touched={!!touched.email}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched('email')}
                  placeholder="jane@example.com"
                  className={inputClass(!!touched.email && !!errors.email)}
                />
              </FieldShell>

              <FieldShell label="Message" error={errors.message} touched={!!touched.message}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onBlur={() => markTouched('message')}
                  placeholder="What's on your mind?"
                  rows={4}
                  className={inputClass(!!touched.message && !!errors.message)}
                />
              </FieldShell>

              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
              >
                <Send className="h-4 w-4" /> Send message
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="terminal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-xs text-white/70"
            >
              <div className="mb-2 flex items-center gap-2 text-white/40">
                <Terminal className="h-3.5 w-3.5" /> transmission log
              </div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                &gt; validating payload... OK
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                &gt; opening secure channel to gateway...
              </motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                &gt; transmitting message...
              </motion.p>

              {status === 'submitting' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="mt-1 flex items-center gap-2 text-white/50"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> awaiting acknowledgement...
                </motion.p>
              )}

              {status === 'success' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                  <p className="mt-1 text-emerald-300">&gt; ACK 200 — message delivered.</p>
                  <button
                    onClick={reset}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Send another transmission
                  </button>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
                  <p className="mt-1 text-red-400">&gt; ERROR — transmission failed. Channel may be down.</p>
                  <button
                    onClick={() => setStatus('idle')}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Retry
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-4">
        <a
          href={`mailto:${EMAIL}`}
          className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <Mail className="h-4 w-4" />
          {EMAIL}
        </a>

        <div className="flex items-center gap-3">
          <SocialLink href="https://github.com/bhardwaj-anuj64" label="GitHub" iconId="github-icon" />
          <SocialLink href="https://www.linkedin.com/in/anujbhardwaj1996" label="LinkedIn" iconId="linkedin-icon" />
          <SocialLink href="https://www.instagram.com/anuj.bhardwaj64" label="Instagram" iconId="instagram-icon" />
        </div>
      </div>
    </FadeSection>
  )
}
