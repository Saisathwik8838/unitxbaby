import React, { useState } from "react";
import { FaBars, FaTimes, FaMagic, FaHome, FaTachometerAlt, FaInfoCircle, FaRocket } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* SIDEBAR TOGGLE BUTTON */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-[999] p-3 bg-white/80 shadow-lg rounded-xl backdrop-blur-md
                   md:hidden hover:scale-110 transition"
      >
        <FaBars className="text-indigo-600 text-xl" />
      </button>

      {/* OVERLAY */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[998]"
        ></div>
      )}

      {/* SIDEBAR PANEL */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white/90 shadow-2xl backdrop-blur-xl 
        z-[999] transform transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Header */}
        <div className="p-6 flex justify-between items-center border-b">
          <div className="flex items-center gap-2 text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
            <FaMagic className="text-indigo-600" />
            UnitxTester
          </div>

          <button onClick={() => setOpen(false)} className="md:hidden">
            <FaTimes className="text-gray-700 text-2xl" />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex flex-col p-6 space-y-5 text-gray-800 font-medium">

          <button
            className="flex items-center gap-3 hover:text-indigo-600 transition"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setOpen(false);
            }}
          >
            <FaHome /> Home
          </button>

          <button
            className="flex items-center gap-3 hover:text-indigo-600 transition"
            onClick={() => {
              document.getElementById("how-it-works")?.scrollIntoView();
              setOpen(false);
            }}
          >
            <FaInfoCircle /> How It Works
          </button>

          <button
            className="flex items-center gap-3 hover:text-indigo-600 transition"
            onClick={() => {
              document.getElementById("explorer")?.scrollIntoView();
              setOpen(false);
            }}
          >
            <FaRocket /> Get Started
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3 hover:text-pink-600 transition"
          >
            <FaTachometerAlt className="text-pink-600" />
            Dashboard
          </button>

        </nav>
      </div>
    </>
  );
};

export default Sidebar;
