import React from "react";

const HowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="py-24 px-6 scroll-mt-32 relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute -top-20 right-20 w-[500px] h-[500px] bg-purple-300 blur-[200px] opacity-30 rounded-full"></div>

      {/* Section Header */}
      <div className="max-w-7xl mx-auto text-center mb-12 relative z-10">
        <h2 className="text-4xl font-extrabold text-gray-900">
          How It Works
        </h2>
        <p className="text-gray-700 text-lg mt-3 max-w-2xl mx-auto">
          Follow these simple steps to generate AI-powered test cases for any GitHub repository.
        </p>
      </div>

      {/* Step Cards */}
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-10 relative z-10">

        {/* Step 1 */}
        <div className="bg-white/70 backdrop-blur-xl shadow-xl border border-white/40 rounded-2xl p-8 hover:shadow-2xl hover:scale-[1.02] transition-all">
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg text-2xl">
            1
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mt-6">
            Sign In with GitHub
          </h3>
          <p className="text-gray-600 mt-3">
            Securely authenticate your GitHub account to access your repositories within the tool.
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-white/70 backdrop-blur-xl shadow-xl border border-white/40 rounded-2xl p-8 hover:shadow-2xl hover:scale-[1.02] transition-all">
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full shadow-lg text-2xl">
            2
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mt-6">
            Explore Your Repository
          </h3>
          <p className="text-gray-600 mt-3">
            Browse your repository files with syntax-highlighted previews and select the files to test.
          </p>
        </div>

        {/* Step 3 */}
        <div className="bg-white/70 backdrop-blur-xl shadow-xl border border-white/40 rounded-2xl p-8 hover:shadow-2xl hover:scale-[1.02] transition-all">
          <div className="w-16 h-16 mx-auto flex items-center justify-center bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-full shadow-lg text-2xl">
            3
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mt-6">
            Generate AI Test Cases
          </h3>
          <p className="text-gray-600 mt-3">
            Select a test framework, click generate, and get high-quality AI-generated test code instantly.
          </p>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
