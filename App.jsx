import React from "react";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Owner from "./pages/Owner.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/hasta/:slug" element={<Owner />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
