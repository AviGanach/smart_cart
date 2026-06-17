import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Receipts from './pages/Receipts';
import Products from './pages/Products';
import Compare from './pages/Compare';

// Family UUID – set REACT_APP_FAMILY_ID in your .env file.
// Get the value by running in Supabase SQL Editor:
//   INSERT INTO families (name) VALUES ('המשפחה שלי') RETURNING id;
export const FAMILY_ID = process.env.REACT_APP_FAMILY_ID || '';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="receipts" element={<Receipts />} />
          <Route path="products" element={<Products />} />
          <Route path="compare" element={<Compare />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
