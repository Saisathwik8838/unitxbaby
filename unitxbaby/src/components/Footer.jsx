import React from "react";
import { FaGithub, FaHeart } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="mt-32 bg-white/30 backdrop-blur-xl border-t border-white/40">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4">

        {/* LEFT */}
        <div className="text-gray-700 text-center md:text-left">
          © {new Date().getFullYear()} 
          <span className="font-semibold"> UnitxTester</span>.
          Built with <FaHeart className="inline text-red-500" /> for developers.
        </div>

        {/* RIGHT */}
        <a
          href="https://github.com"
          target="_blank"
          className="flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition"
        >
          <FaGithub /> View on GitHub
        </a>
      </div>
    </footer>
  );
};

export default Footer;
