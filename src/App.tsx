import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Garage from './pages/Garage'
import PitWall from './pages/PitWall'
import Hypotheses from './pages/Hypotheses'
import Mechanism from './pages/Mechanism'
import Assays from './pages/Assays'
import Radar from './pages/Radar'
import Power from './pages/Power'
import Suspension from './pages/Suspension'
import Graph from './pages/Graph'
import Review from './pages/Review'
import Theory from './pages/Theory'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Garage />} />
        <Route path="pit-wall" element={<PitWall />} />
        <Route path="hypotheses" element={<Hypotheses />} />
        <Route path="mechanism" element={<Mechanism />} />
        <Route path="assays" element={<Assays />} />
        <Route path="radar" element={<Radar />} />
        <Route path="power" element={<Power />} />
        <Route path="suspension" element={<Suspension />} />
        <Route path="graph" element={<Graph />} />
        <Route path="theory" element={<Theory />} />
        <Route path="review" element={<Review />} />
      </Route>
    </Routes>
  )
}
