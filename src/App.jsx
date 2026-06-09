import { Route, Routes } from 'react-router-dom';
import AppLayout from './layout/AppLayout';
import About from './pages/About';
import Antibodies from './pages/Antibodies';
import Dilutions from './pages/Dilutions';
import Dosage from './pages/Dosage';
import Home from './pages/Home';
import Molarity from './pages/Molarity';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/dosage" element={<Dosage />} />
        <Route path="/dosage/:method" element={<Dosage />} />
        <Route path="/molarity" element={<Molarity />} />
        <Route path="/dilutions" element={<Dilutions />} />
        <Route path="/antibodies" element={<Antibodies />} />
      </Route>
    </Routes>
  );
}
