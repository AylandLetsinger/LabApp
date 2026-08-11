import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import About from './pages/About';
import Antibodies from './pages/Antibodies';
import Dilutions from './pages/Dilutions';
import Dosage from './pages/Dosage';
import Home from './pages/Home';
import Molarity from './pages/Molarity';
import Recipes from './pages/Recipes';
import StockSolution from './pages/StockSolution';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dosage" element={<Dosage />} />
        {/* Stock Solution moved out of Dosage. Anyone holding the old link is
            sent to the new one rather than bounced to the Dosage index. */}
        <Route path="/dosage/stock-solution" element={<Navigate to="/stock-solution" replace />} />
        <Route path="/dosage/:method" element={<Dosage />} />
        <Route path="/molarity" element={<Molarity />} />
        <Route path="/dilutions" element={<Dilutions />} />
        <Route path="/antibodies" element={<Antibodies />} />
        <Route path="/stock-solution" element={<StockSolution />} />
        <Route path="/recipes" element={<Recipes />} />
      </Route>
    </Routes>
  );
}
