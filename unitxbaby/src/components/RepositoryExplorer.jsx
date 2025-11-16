import React, { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchUserRepos,
  fetchDirectoryContents,
  setSelectedRepo,
  setCurrentPath,
  addToPathHistory,
  goBackInHistory,
} from '../store/slices/repositorySlice';
import {
  fetchFileContent,
  addSelectedFile,
  removeSelectedFile,
  clearSelectedFiles,
  setFileContent,
} from '../store/slices/fileSlice';
import {
  generateTestSummaries,
  generateTestCode,
  setTestFramework,
  setTestType,
  setSelectedTestForModal,
} from '../store/slices/testSlice';
import {
  setIsGeneratingSummaries,
  setIsGeneratingTests,
  setError,
} from '../store/slices/uiSlice';
import { SignInButton } from './SignInButton';
import { SignOutButton } from './SignOutButton';
import { FaFolder, FaFile, FaArrowLeft, FaCheck, FaTimes, FaMagic, FaCode, FaExpand, FaCompress, FaQuestionCircle, FaInfoCircle } from 'react-icons/fa';

const RepositoryExplorer = () => {
  const { session, status, signOut } = useAuth();
  const dispatch = useAppDispatch();
  
  const repos = useAppSelector((state) => state.repository.repos);
  const selectedRepo = useAppSelector((state) => state.repository.selectedRepo);
  const currentPath = useAppSelector((state) => state.repository.currentPath);
  const directoryContents = useAppSelector((state) => state.repository.directoryContents);
  const pathHistory = useAppSelector((state) => state.repository.pathHistory);
  const repoLoading = useAppSelector((state) => state.repository.loading);
  
  const fileContent = useAppSelector((state) => state.file.fileContent);
  const selectedFiles = useAppSelector((state) => state.file.selectedFiles);
  
  const testCaseSummaries = useAppSelector((state) => state.test.testCaseSummaries);
  const generatedTests = useAppSelector((state) => state.test.generatedTests);
  const testFramework = useAppSelector((state) => state.test.testFramework);
  const testType = useAppSelector((state) => state.test.testType);
  const selectedTestForModal = useAppSelector((state) => state.test.selectedTestForModal);
  
  const isGeneratingSummaries = useAppSelector((state) => state.ui.isGeneratingSummaries);
  const isGeneratingTests = useAppSelector((state) => state.ui.isGeneratingTests);
  const error = useAppSelector((state) => state.ui.error);

  const [showTestModal, setShowTestModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenContent, setFullscreenContent] = useState(null);
  const [fullscreenLanguage, setFullscreenLanguage] = useState('text');

  useEffect(() => {
    if (session?.accessToken) {
      dispatch(fetchUserRepos(session.accessToken));
    }
  }, [session, dispatch]);

  useEffect(() => {
    if (selectedRepo && session?.accessToken) {
      const [owner, repo] = selectedRepo.split('/');
      dispatch(fetchDirectoryContents({ owner, repo, path: currentPath, accessToken: session.accessToken }));
    }
  }, [selectedRepo, currentPath, session, dispatch]);

  const handleRepoSelect = (repo) => {
    dispatch(setSelectedRepo(`${repo.owner.login}/${repo.name}`));
    dispatch(setCurrentPath(''));
    dispatch(clearSelectedFiles());
  };

  const handleItemClick = async (item) => {
    if (item.type === 'dir') {
      dispatch(setCurrentPath(item.path));
      dispatch(addToPathHistory(item.path));
    } else {
      // Handle file click - fetch and display content
      const [owner, repo] = selectedRepo.split('/');
      await dispatch(fetchFileContent({ owner, repo, path: item.path, accessToken: session.accessToken }));
    }
  };

  const handleFileSelect = () => {
    if (fileContent) {
      const isSelected = selectedFiles.some(f => f.path === fileContent.path);
      if (isSelected) {
        dispatch(removeSelectedFile(fileContent.path));
      } else {
        dispatch(addSelectedFile(fileContent));
      }
    }
  };

  const handleGenerateTests = async () => {
    if (selectedFiles.length === 0) {
      dispatch(setError('Please select at least one file to generate test cases'));
      return;
    }

    // Validate that selected files have content
    const filesWithContent = selectedFiles.filter(f => f.content && f.content.trim().length > 0);
    if (filesWithContent.length === 0) {
      dispatch(setError('Selected files do not have content. Please click on files to load their content first.'));
      return;
    }

    if (filesWithContent.length !== selectedFiles.length) {
      dispatch(setError(`Warning: ${selectedFiles.length - filesWithContent.length} file(s) have no content. Generating tests for ${filesWithContent.length} file(s).`));
    }

    try {
      dispatch(setIsGeneratingSummaries(true));
      dispatch(setError(null));
      
      await dispatch(generateTestSummaries({
        selectedFiles: filesWithContent,
        testFramework,
        testType,
      })).unwrap();
      
      dispatch(setIsGeneratingSummaries(false));
    } catch (err) {
      dispatch(setIsGeneratingSummaries(false));
      console.error('Test generation error (full):', err);
      console.error('Error payload:', err.payload);
      console.error('Error message:', err.message);
      console.error('Error error:', err.error);
      
      // Handle different error formats
      let errorMessage = 'Failed to generate test summaries';
      if (err.payload) {
        errorMessage = err.payload;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = err.error;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      dispatch(setError(errorMessage));
    }
  };

  const handleGenerateTestCode = async (summary) => {
    try {
      dispatch(setIsGeneratingTests(true));
      dispatch(setError(null));
      
      await dispatch(generateTestCode({
        summary,
        selectedFiles,
        testFramework,
        testType,
      })).unwrap();
      
      setShowTestModal(true);
      dispatch(setIsGeneratingTests(false));
    } catch (err) {
      dispatch(setIsGeneratingTests(false));
      dispatch(setError(err.message || 'Failed to generate test code'));
    }
  };

  const getFileExtension = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase() || 'text';
    // Map file extensions to syntax highlighter language names
    const languageMap = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'ps1': 'powershell',
      'sql': 'sql',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'vue': 'vue',
      'svelte': 'svelte',
      'dart': 'dart',
      'r': 'r',
      'm': 'objectivec',
      'mm': 'objectivec',
      'pl': 'perl',
      'lua': 'lua',
      'hs': 'haskell',
      'elm': 'elm',
      'clj': 'clojure',
      'ex': 'elixir',
      'exs': 'elixir',
      'erl': 'erlang',
      'ml': 'ocaml',
      'fs': 'fsharp',
      'vb': 'vbnet',
      'test.js': 'javascript',
      'spec.js': 'javascript',
      'test.ts': 'typescript',
      'spec.ts': 'typescript',
      'test.py': 'python',
      'spec.py': 'python',
    };
    return languageMap[ext] || ext;
  };

    const getTestLanguage = (framework) => {
    const frameworkMap = {
      'jest': 'javascript',
      'mocha': 'javascript',
      'jasmine': 'javascript',
      'vitest': 'javascript',
      'cypress': 'javascript',
      'playwright': 'javascript',
      'pytest': 'python',
      'unittest': 'python',
      'rspec': 'ruby',
      'minitest': 'ruby',
      'junit': 'java',
      'testng': 'java',
      'xunit': 'csharp',
      'nunit': 'csharp',
      'go': 'go',
      'ginkgo': 'go',
      'gomega': 'go',
    };
    return frameworkMap[framework?.toLowerCase()] || 'javascript';
  };

  const handleFullscreen = (content, language) => {
    setFullscreenContent(content);
    setFullscreenLanguage(language);
    setIsFullscreen(true);
    
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  };

  const handleExitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
    setIsFullscreen(false);
    setFullscreenContent(null);
  };

  useEffect(() => {
    const onFSChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        setFullscreenContent(null);
      }
    };

    const onESC = (e) => {
      if (e.key === 'Escape' && isFullscreen) handleExitFullscreen();
    };

    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('keydown', onESC);

    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('keydown', onESC);
    };
  }, [isFullscreen]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-b from-transparent to-indigo-50 rounded-2xl p-8">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <p className="mt-4 text-gray-700 text-lg">Loading...</p>
      </div>
    );
  }

  // Unauthenticated
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-10 bg-gradient-to-br from-indigo-50 via-violet-50 to-pink-50 shadow-xl border border-white/50 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome to UnitxTester</h2>
        <p className="text-gray-700 text-center mb-6 max-w-md">
          Sign in with GitHub to explore your repositories and generate AI-powered test cases.
        </p>
        <SignInButton />
      </div>
    );
  }

  // Access Token invalid
  if (!session.accessToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl p-10 bg-gradient-to-br from-indigo-50 via-violet-50 to-pink-50 shadow-xl border border-white/50 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Authentication Error</h2>
        <p className="text-gray-700 text-center mb-6 max-w-md">
          Access token missing. Please sign out and log in again.
        </p>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {selectedRepo && (
            <button
              onClick={() => {
                dispatch(setSelectedRepo(null));
                dispatch(clearSelectedFiles());
                dispatch(setFileContent(null));
              }}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 transition-all shadow-sm border border-white/40"
              title="Back to repositories"
            >
              <FaArrowLeft className="text-gray-700" />
            </button>
          )}

          <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {selectedRepo ? `Repository: ${selectedRepo}` : 'Your GitHub Repositories'}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 rounded-lg bg-gradient-to-r from-indigo-200 to-violet-200 hover:from-indigo-300 hover:to-violet-300 shadow-sm transition-all"
            title="How to use this page"
          >
            <FaQuestionCircle className="text-indigo-700 text-lg" />
          </button>
          <SignOutButton />
        </div>
      </div>

      {/* Repo List */}
      {!selectedRepo && (
        <>
          {repoLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
          ) : repos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => handleRepoSelect(repo)}
                  className="relative cursor-pointer group transition-all transform hover:-translate-y-2 hover:shadow-2xl rounded-2xl overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-violet-500 to-pink-500 opacity-10 blur-xl group-hover:opacity-20 transition"></div>

                  <div className="relative z-10 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl p-6 shadow">
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">
                      {repo.name}
                    </h4>
                    <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                      {repo.description || 'No description'}
                    </p>

                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="px-2 py-1 bg-white/50 rounded-full text-gray-800 shadow-sm">
                        {repo.language || 'N/A'}
                      </span>
                      <span className="font-medium text-indigo-600 group-hover:underline">
                        Explore →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-600 py-10">
              No repositories found.
            </div>
          )}
        </>
      )}

      {/* Directory Browser */}
      {selectedRepo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          
          {/* Left Column – Directory Tree */}
          <div className="lg:col-span-1 bg-gradient-to-b from-white to-indigo-50 border border-white/40 shadow-xl rounded-2xl p-5 backdrop-blur-sm">

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {pathHistory.length > 1 && (
                  <button
                    onClick={() => dispatch(goBackInHistory())}
                    className="p-2 bg-white/60 hover:bg-white shadow-sm rounded-md transition-all border border-gray-200"
                    title="Go Back"
                  >
                    <FaArrowLeft className="text-gray-700" />
                  </button>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {currentPath || "Root"}
                </span>
              </div>
            </div>

            {/* Directory Items */}
            {repoLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto pr-1 space-y-2">
                {directoryContents.map((item) => {
                  const isSelected = selectedFiles.some((f) => f.path === item.path);

                  return (
                    <div
                      key={item.path}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${
                        item.type === "dir"
                          ? "bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100"
                          : "bg-white hover:bg-gray-100"
                      } hover:-translate-y-0.5 shadow-sm`}
                      onClick={() => handleItemClick(item)}
                      title={item.path}
                    >
                      <div
                        className={`p-2 rounded-lg shadow-sm ${
                          item.type === "dir"
                            ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {item.type === "dir" ? <FaFolder /> : <FaFile />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="truncate font-medium text-gray-800 text-sm">
                            {item.name}
                          </span>
                          {isSelected && <FaCheck className="text-green-600" />}
                        </div>
                        <span className="text-xs text-gray-500 truncate">{item.path}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-800">
                    Selected Files ({selectedFiles.length})
                  </span>
                  <button
                    className="text-xs text-rose-600 hover:text-rose-800"
                    onClick={() => dispatch(clearSelectedFiles())}
                  >
                    Clear All
                  </button>
                </div>

                <div className="mt-2 space-y-2 max-h-36 overflow-y-auto pr-1">
                  {selectedFiles.map((file) => (
                    <div
                      key={file.path}
                      className="bg-white/70 p-2 rounded-md border border-gray-200 flex justify-between items-center shadow-sm"
                    >
                      <span className="flex-1 truncate text-xs">{file.name}</span>
                      <button
                        onClick={() => dispatch(removeSelectedFile(file.path))}
                        className="text-rose-600 hover:text-rose-800 text-sm"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Generation Controls */}
            {selectedFiles.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                
                {/* Framework Select */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-700">Test Framework</label>
                  <select
                    value={testFramework}
                    onChange={(e) => dispatch(setTestFramework(e.target.value))}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm"
                  >
                    <option value="jest">Jest</option>
                    <option value="mocha">Mocha</option>
                    <option value="vitest">Vitest</option>
                    <option value="pytest">PyTest</option>
                  </select>
                </div>

                {/* Test Type Select */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-700">Test Type</label>
                  <select
                    value={testType}
                    onChange={(e) => dispatch(setTestType(e.target.value))}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm bg-white shadow-sm"
                  >
                    <option value="unit">Unit</option>
                    <option value="integration">Integration</option>
                    <option value="e2e">E2E</option>
                  </select>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateTests}
                  disabled={isGeneratingSummaries}
                  className={`w-full relative overflow-hidden group px-4 py-2 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg ${
                    isGeneratingSummaries
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 hover:scale-[1.02]"
                  }`}
                >
                  <span className="z-10 flex items-center gap-2">
                    <FaMagic />
                    {isGeneratingSummaries ? "Generating..." : "Generate Test Cases"}
                  </span>

                  {!isGeneratingSummaries && (
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity bg-gradient-to-r from-indigo-300/40 via-violet-300/40 to-pink-300/40" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column – File Viewer + Test Suggestions */}
          <div className="lg:col-span-2 space-y-6">

            {/* File Content Viewer */}
            {fileContent && (
              <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-5">
                
                {/* File Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                    <FaFile className="text-indigo-500" /> {fileContent.name}
                  </h4>

                  <div className="flex gap-3">
                    {/* Select File Button */}
                    <button
                      onClick={handleFileSelect}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm text-white ${
                        selectedFiles.some(f => f.path === fileContent.path)
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                          : "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
                      }`}
                    >
                      {selectedFiles.some(f => f.path === fileContent.path)
                        ? "Selected ✓"
                        : "Select File"}
                    </button>

                    {/* Close File */}
                    <button
                      onClick={() => dispatch(setFileContent(null))}
                      className="px-4 py-1.5 text-sm font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Code Viewer */}
                <div className="relative border rounded-xl overflow-hidden shadow-lg">

                  {/* Fullscreen Button */}
                  <button
                    onClick={() =>
                      handleFullscreen(
                        fileContent.content,
                        getFileExtension(fileContent.name)
                      )
                    }
                    className="absolute top-3 right-3 z-10 bg-gray-900/70 hover:bg-gray-900 text-white p-2 rounded-md transition"
                    title="Fullscreen"
                  >
                    <FaExpand />
                  </button>

                  {/* Syntax Highlight */}
                  <SyntaxHighlighter
                    language={getFileExtension(fileContent.name)}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, fontSize: "0.9rem" }}
                    showLineNumbers
                    wrapLongLines
                  >
                    {fileContent.content}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}

            {/* Test Case Summaries */}
            {testCaseSummaries.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6">
                <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaCode className="text-indigo-600" /> Test Case Suggestions
                </h4>

                <div className="max-h-[420px] overflow-y-auto space-y-4 pr-1">
                  {testCaseSummaries.map((summary) => (
                    <div
                      key={summary.id}
                      className="p-4 rounded-xl bg-white shadow hover:shadow-lg transition-all border border-gray-200 cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                          <p className="font-medium text-gray-900 group-hover:text-indigo-700 transition">
                            {summary.description}
                          </p>

                          <div className="flex gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                              {summary.type}
                            </span>
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md">
                              {summary.framework}
                            </span>

                            {summary.filePath && (
                              <span className="text-xs text-gray-500">
                                {summary.filePath}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Generate Code Button */}
                        <button
                          onClick={() => handleGenerateTestCode(summary)}
                          disabled={isGeneratingTests}
                          className={`px-4 py-1.5 text-xs font-medium rounded-md text-white transition-all shadow-sm ${
                            isGeneratingTests
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 hover:scale-105"
                          }`}
                        >
                          {isGeneratingTests ? "..." : "Generate Code"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Box */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-rose-700">Error</p>
                    <p className="text-sm text-rose-600 mt-1">{error}</p>
                  </div>
                  <button
                    onClick={() => dispatch(setError(null))}
                    className="text-rose-700 hover:text-rose-900"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!fileContent &&
              testCaseSummaries.length === 0 && (
                <div className="p-10 bg-gradient-to-r from-indigo-50 via-violet-50 to-pink-50 border border-white/40 rounded-2xl shadow text-center">
                  <p className="text-gray-600">
                    Select a file to view its content or generate test cases.
                  </p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Test Code Modal */}
      {showTestModal && selectedTestForModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-white/50 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white/70">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FaCode className="text-indigo-600" /> Generated Test Code
              </h3>
              <button
                onClick={() => {
                  setShowTestModal(false);
                  dispatch(setSelectedTestForModal(null));
                }}
                className="p-2 rounded-md hover:bg-gray-200 transition"
              >
                <FaTimes className="text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 bg-white/70">
              
              {/* Summary Information */}
              <div className="mb-4">
                <p className="font-medium text-gray-900">{selectedTestForModal.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                    {selectedTestForModal.type}
                  </span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-md">
                    {selectedTestForModal.framework}
                  </span>
                </div>
              </div>

              {/* Code Box */}
              <div className="relative border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                
                {/* Fullscreen Button */}
                <button
                  onClick={() =>
                    handleFullscreen(
                      selectedTestForModal.code || "No code generated",
                      getTestLanguage(selectedTestForModal.framework)
                    )
                  }
                  className="absolute top-3 right-3 z-10 bg-gray-900/70 hover:bg-gray-900 text-white p-2 rounded-md transition"
                  title="Fullscreen"
                >
                  <FaExpand />
                </button>

                {/* Syntax Highlighter */}
                <SyntaxHighlighter
                  language={getTestLanguage(selectedTestForModal.framework)}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, fontSize: "0.9rem" }}
                  wrapLongLines
                  showLineNumbers
                >
                  {selectedTestForModal.code || "No code generated"}
                </SyntaxHighlighter>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-white/70 flex justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedTestForModal.code || "");
                  alert("Code copied to clipboard!");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Copy Code
              </button>

              <button
                onClick={() => {
                  setShowTestModal(false);
                  dispatch(setSelectedTestForModal(null));
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-lg hover:scale-105 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Code Viewer */}
      {isFullscreen && fullscreenContent && (
        <div className="fixed inset-0 bg-gray-900 z-[9999] flex flex-col">
          {/* Fullscreen Header */}
          <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
            <h3 className="text-white font-semibold text-lg">
              Code Viewer (Fullscreen)
            </h3>

            <button
              onClick={handleExitFullscreen}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
            >
              <FaCompress /> Exit Fullscreen
            </button>
          </div>

          {/* Fullscreen Code */}
          <div className="flex-1 overflow-auto p-4">
            <SyntaxHighlighter
              language={fullscreenLanguage}
              style={vscDarkPlus}
              customStyle={{ margin: 0, fontSize: "1rem" }}
              wrapLongLines
              showLineNumbers
            >
              {fullscreenContent}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-white/50 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-xl font-semibold flex items-center gap-3">
                <FaInfoCircle className="text-indigo-600" />
                How to Use This Tool
              </h3>

              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 rounded-md hover:bg-gray-200 transition"
              >
                <FaTimes className="text-gray-700" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Getting Started */}
              <section>
                <h4 className="text-lg font-semibold mb-2 text-indigo-600">Getting Started</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Sign in with GitHub to access your repositories.</li>
                  <li>Choose a repository to explore.</li>
                  <li>Browse folders and view file contents.</li>
                </ol>
              </section>

              {/* File Exploration */}
              <section>
                <h4 className="text-lg font-semibold mb-2 text-indigo-600">Exploring Files</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Navigate folders by clicking on them.</li>
                  <li>Click on a file to view its contents.</li>
                  <li>Use fullscreen mode for large files.</li>
                </ol>
              </section>

              {/* Test Generation */}
              <section>
                <h4 className="text-lg font-semibold mb-2 text-indigo-600">Generating Tests</h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Select one or more files.</li>
                  <li>Choose the test framework and type.</li>
                  <li>Click <strong>Generate Test Cases</strong>.</li>
                  <li>Generate actual test code from suggestions.</li>
                </ol>
              </section>
              {/* Features */}
              <section>
                <h4 className="text-lg font-semibold mb-2 text-indigo-600">Features</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Modern UI with gradients and hover animations.</li>
                  <li>AI-powered test case generation.</li>
                  <li>Supports 40+ programming languages.</li>
                  <li>Syntax highlighting with line numbers.</li>
                  <li>Fullscreen code viewer with ESC support.</li>
                  <li>Beautiful modals and elegant transitions.</li>
                </ul>
              </section>

              {/* Tips */}
              <section>
                <h4 className="text-lg font-semibold mb-2 text-indigo-600">Tips</h4>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>Load file contents before generating tests.</li>
                  <li>Select multiple related files for better AI results.</li>
                  <li>Use fullscreen mode for large or complex files.</li>
                </ul>
              </section>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-lg shadow hover:scale-105 transition"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositoryExplorer;

  