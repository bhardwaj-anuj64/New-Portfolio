import { useEffect } from 'react'
import { AdminPortalModal } from './components/admin/AdminPortalModal'
import { ContactSection } from './components/contact/ContactSection'
import { Footer } from './components/footer/Footer'
import { Hero } from './components/hero/Hero'
import { Navbar } from './components/nav/Navbar'
import { PerspectiveSection } from './components/perspective/PerspectiveSection'
import { QualificationsSection } from './components/qualifications/QualificationsSection'
import { TinkeringSection } from './components/tinkering/TinkeringSection'
import { LabsModal } from './components/tools/LabsModal'
import { WelcomeSection } from './components/welcome/WelcomeSection'
import { recordPageView, reportClientError } from './services/api'
import { useAdminShortcut } from './store/useAdminStore'

function App() {
  useAdminShortcut()

  useEffect(() => {
    recordPageView()

    const onError = (e: ErrorEvent) => reportClientError(e.message, e.filename)
    const onRejection = (e: PromiseRejectionEvent) =>
      reportClientError(String(e.reason?.message ?? e.reason), 'unhandledrejection')

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <Hero />
      <WelcomeSection />
      <PerspectiveSection />
      <TinkeringSection />
      <QualificationsSection />
      <ContactSection />
      <Footer />

      <AdminPortalModal />
      <LabsModal />
    </div>
  )
}

export default App
