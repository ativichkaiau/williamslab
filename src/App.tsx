import { lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

// Every page is its own chunk: the shell loads first, and a page's code
// arrives when it is first visited. Meanwhile Layout's Suspense boundary
// shows that page's blueprint (components/Skeleton.tsx).
const EvidenceLibrary = lazy(() => import('./pages/EvidenceLibrary'))
const Garage = lazy(() => import('./pages/Garage'))
const PitWall = lazy(() => import('./pages/PitWall'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const LitLink = lazy(() => import('./pages/LitLink'))
const Hypotheses = lazy(() => import('./pages/Hypotheses'))
const Mechanism = lazy(() => import('./pages/Mechanism'))
const Assays = lazy(() => import('./pages/Assays'))
const Radar = lazy(() => import('./pages/Radar'))
const Power = lazy(() => import('./pages/Power'))
const GrantAims = lazy(() => import('./pages/GrantAims'))
const Suspension = lazy(() => import('./pages/Suspension'))
const Graph = lazy(() => import('./pages/Graph'))
const Review = lazy(() => import('./pages/Review'))
const Theory = lazy(() => import('./pages/Theory'))
const SrmaProtocol = lazy(() => import('./pages/SrmaProtocol'))
const Screening = lazy(() => import('./pages/Screening'))
const Prisma = lazy(() => import('./pages/Prisma'))
const Studies = lazy(() => import('./pages/Studies'))
const MetaAnalysis = lazy(() => import('./pages/MetaAnalysis'))
const DiagnosticMA = lazy(() => import('./pages/DiagnosticMA'))
const References = lazy(() => import('./pages/References'))
const Manuscript = lazy(() => import('./pages/Manuscript'))
const Poster = lazy(() => import('./pages/Poster'))
const Reviewers = lazy(() => import('./pages/Reviewers'))
const SharedImport = lazy(() => import('./pages/SharedImport'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Garage />} />
        <Route path="pit-wall" element={<PitWall />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="litlink" element={<LitLink />} />
        <Route path="hypotheses" element={<Hypotheses />} />
        <Route path="mechanism" element={<Mechanism />} />
        <Route path="assays" element={<Assays />} />
        <Route path="radar" element={<Radar />} />
        <Route path="power" element={<Power />} />
        <Route path="aims" element={<GrantAims />} />
        <Route path="suspension" element={<Suspension />} />
        <Route path="graph" element={<Graph />} />
        <Route path="theory" element={<Theory />} />
        <Route path="review" element={<Review />} />
        <Route path="protocol" element={<SrmaProtocol />} />
        <Route path="screening" element={<Screening />} />
        <Route path="prisma" element={<Prisma />} />
        <Route path="studies" element={<Studies />} />
        <Route path="meta" element={<MetaAnalysis />} />
        <Route path="diagnostic" element={<DiagnosticMA />} />
        <Route path="references" element={<References />} />
        <Route path="evidence" element={<EvidenceLibrary />} />
        <Route path="manuscript" element={<Manuscript />} />
        <Route path="poster" element={<Poster />} />
        <Route path="reviewers" element={<Reviewers />} />
        <Route path="shared/:id" element={<SharedImport />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
