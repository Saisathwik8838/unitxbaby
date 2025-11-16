import React, { useState, useEffect } from 'react';
import { FaMagic, FaPlay, FaCheck, FaTachometerAlt } from 'react-icons/fa';
import RepositoryExplorer from './RepositoryExplorer';
import HowItWorks from './HowItWorks';
import Footer from './Footer';
import Sidebar from "./Sidebar";
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);
  

  return (

    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">

      {/* NAVBAR */}
      <header
        className={`fixed w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-lg shadow-lg py-2 border-b border-white/50"
            : "bg-transparent py-4"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          
          {/* BRAND */}
          <div className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
            <FaMagic className="text-indigo-600 drop-shadow-sm" />
            UnitxTester
          </div>

          {/* LINKS */}
          <div className="hidden md:flex items-center space-x-8">

            <button
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView()}
              className="text-gray-700 hover:text-indigo-600 transition font-medium"
            >
              How It Works
            </button>

            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-gray-700 hover:text-pink-600 transition font-medium"
            >
              <FaTachometerAlt className="text-pink-500" />
              Dashboard
            </button>

            <button
              onClick={() => {
                document.getElementById("explorer")?.scrollIntoView();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 
                         text-white shadow-md hover:shadow-xl hover:scale-105 transition-all"
            >
              Get Started
            </button>

          </div>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="pt-44 pb-24 text-center px-6 max-w-7xl mx-auto relative">

        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-300 blur-[200px] opacity-30 rounded-full"></div>
        <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-pink-300 blur-[200px] opacity-30 rounded-full"></div>

        <h1 className="relative text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
          AI-Powered Test Case Generation  
          <br />
          <span className="bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
            for Modern Developers
          </span>
        </h1>

        <p className="relative text-lg md:text-xl text-gray-700 mt-6 max-w-3xl mx-auto">
          Automatically generate accurate, AI-driven unit tests for your GitHub repositories —
          speeding up your development workflow like never before.
        </p>

        {/* CTA BUTTON (Restored) */}
      </section>

      {/* HOW IT WORKS */}
      <HowItWorks />

      {/* EXPLORER SECTION */}
      <section id="explorer" className="py-16 px-6 scroll-mt-32">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900">Explore Your Repository</h2>
            <p className="text-gray-700 text-lg mt-3">
              Connect your GitHub account and let the AI handle the test generation.
            </p>
          </div>

          <div className="w-full bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl p-6 rounded-2xl">
            <RepositoryExplorer />

            <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FaCheck className="text-green-500" />
                Supports JavaScript, TypeScript, Python, Java & more
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FaCheck className="text-green-500" />
                AI-Powered Test Suggestions
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FaCheck className="text-green-500" />
                Modern UI & Fullscreen Code Viewer
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <Footer />

    </div>
  );
};

export default LandingPage;
