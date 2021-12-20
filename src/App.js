import React, { useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { Home } from "./pages/Home";
import { Meet } from "./pages/Meet";

export default function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/meet" element={<Meet />}>
          <Route path=":meetID" element={<Meet />} />
        </Route>
      </Routes>
    </div>
  );
}
