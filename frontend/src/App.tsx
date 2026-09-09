import { AdminPortalModal } from './components/admin/AdminPortalModal'
import { ContactSection } from './components/contact/ContactSection'
import { Footer } from './components/footer/Footer'
import { Hero } from './components/hero/Hero'
import { Navbar } from './components/nav/Navbar'
import { PerspectiveSection } from './components/perspective/PerspectiveSection'
import { QualificationsSection } from './components/qualifications/QualificationsSection'
import { TinkeringSection } from './components/tinkering/TinkeringSection'
import { LabsModal } from './components/tools/LabsModal'
import { useAdminShortcut } from './store/useAdminStore'

function App() {
  useAdminShortcut()

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <Hero />
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
