import React, { useEffect, useState } from "react";
import {
  FaCodeBranch,
  FaRobot,
  FaFolderOpen,
  FaSignOutAlt,
  FaMagic,
  FaClock,
  FaStar,
  FaChartLine,
  FaCog,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

const Dashboard = () => {
  const { session, signOut } = useAuth();
  const [recentRepos, setRecentRepos] = useState([]);

  // Demo recent activity (replace with GitHub API later)
  useEffect(() => {
    setRecentRepos([
      { name: "unitx-ai-core", updated: "2 hours ago" },
      { name: "testgen-ui", updated: "1 day ago" },
      { name: "llm-routing-engine", updated: "3 days ago" },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-16 px-6">

      {/* HEADER */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">
          Welcome, {session?.user?.login || "Developer"} 👋
        </h1>

        <button
          onClick={signOut}
          className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-xl shadow hover:bg-red-700 transition"
        >
          <FaSignOutAlt /> Sign Out
        </button>
      </header>

      {/* TOP STATS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        
        {/* Stat 1 */}
        <div className="p-6 bg-white/80 backdrop-blur-xl shadow-xl border border-white/40 rounded-2xl">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaCodeBranch className="text-indigo-600" /> Total Repositories
          </h3>
          <p className="text-4xl font-bold mt-2">42</p>
        </div>

        {/* Stat 2 */}
        <div className="p-6 bg-white/80 backdrop-blur-xl shadow-xl border border-white/40 rounded-2xl">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaMagic className="text-pink-500" /> Tests Generated
          </h3>
          <p className="text-4xl font-bold mt-2">118</p>
        </div>

        {/* Stat 3 */}
        <div className="p-6 bg-white/80 backdrop-blur-xl shadow-xl border border-white/40 rounded-2xl">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FaClock className="text-purple-600" /> Recent Activity
          </h3>
          <p className="text-4xl font-bold mt-2">7</p>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* CARD 1 */}
        <div className="p-6 bg-white/80 backdrop-blur-xl shadow-xl border border-white/40 rounded-2xl hover:shadow-2xl transition">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Repositories</h2>
            <FaFolderOpen className="text-indigo-600 text-3xl" />
          </div>
          <p className="text-gray-600 mt-3">
            Browse and analyze your GitHub repositories.
          </p>
          <a
            href="/#explorer"
            className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Open Explorer
          </a>
        </div>

        {/* CARD 2 */}
        <div className="p-6 bg-white/80 backdrop-blur-xl shadow-xl border border-white/40 rounded-2xl hover:shadow-2xl transition">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">AI Test Generator</h2>
            <FaMagic className="text-pink-500 text-3xl" />
          </div>
          <p className="text-gray-600 mt-3">
            Create tests instantly using AI for supported languages.
          </p>
          <a
            href="/#explorer"
            className="mt-4 inline-block px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:scale-105 transition"
          >
            Generate Tests
          </a>
        </div>

        {/* CARD 3 */}
        <div className="p-6 bg-white/80 backdrop-blur-xl shadow-xl border border-white/40 rounded-2xl hover:shadow-2xl transition">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Quick Settings</h2>
            <FaCog className="text-purple-600 text-3xl" />
          </div>
          <p className="text-gray-600 mt-3">
            Customize themes, API keys, and preferences.
          </p>
          <a
            href="/settings"
            className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Open Settings
          </a>
        </div>

      </div>

      {/* RECENT REPOSITORIES */}
      <div className="max-w-7xl mx-auto mt-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Recent Repositories</h2>

        <div className="bg-white/70 backdrop-blur-lg border border-white/40 shadow-xl rounded-2xl p-6">
          {recentRepos.length === 0 ? (
            <p className="text-gray-500 italic">No recent repos found.</p>
          ) : (
            <ul className="space-y-3">
              {recentRepos.map((repo, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center p-3 bg-white/60 rounded-xl border border-white/40 hover:bg-white transition"
                >
                  <div>
                    <p className="font-semibold text-gray-800">{repo.name}</p>
                    <p className="text-sm text-gray-500">Updated {repo.updated}</p>
                  </div>
                  <FaStar className="text-yellow-500 text-xl" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
