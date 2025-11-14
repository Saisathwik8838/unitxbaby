import React, { useState, useEffect } from 'react';
import { FaGithub, FaPlay, FaMagic, FaCheck } from 'react-icons/fa';
import { AuthProvider } from '../contexts/AuthContext';
import RepositoryExplorer from './RepositoryExplorer';

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
        <header className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-sm py-2' : 'bg-transparent py-4'}`}>
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="text-2xl font-bold text-indigo-600 flex items-center">
              <FaMagic className="mr-2" /> UnitxTester
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-indigo-600 transition-colors">How It Works</a>
              <a href="#explorer" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">Get Started</a>
            </div>
          </nav>
        </header>

        <section className="pt-40 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered Test Case Generation <br />
            <span className="text-indigo-600">for Modern Developers</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Automatically generate comprehensive test cases for your GitHub repositories.
          </p>
          <a 
            href="#explorer" 
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center mx-auto w-fit"
          >
            <FaPlay className="mr-2" /> Try It Now
          </a>
        </section>

        <section id="explorer" className="py-8 bg-gray-50 w-full min-h-screen">
          <div className="mx-4 sm:mx-6 lg:mx-8 xl:mx-auto xl:max-w-[95%] 2xl:max-w-7xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Explore Your Repository
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Connect your GitHub account to browse your repositories and generate test cases.
              </p>
            </div>
            <div className="w-full bg-white p-4 sm:p-6 shadow-xl rounded-lg border border-gray-200">
              <RepositoryExplorer />
              <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-center gap-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <FaCheck className="text-green-500" />
                  <span>Supports JavaScript, TypeScript, Python, and more</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AuthProvider>
  );
};

export default LandingPage;

