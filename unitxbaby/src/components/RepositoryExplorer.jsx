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
    
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    }
  };

  const handleExitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    setIsFullscreen(false);
    setFullscreenContent(null);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        setIsFullscreen(false);
        setFullscreenContent(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        setIsFullscreen(false);
        setFullscreenContent(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-lg p-8">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">GitHub Repository Explorer</h2>
        <p className="text-gray-600 mb-6 text-center">
          Please sign in with GitHub to explore your repositories and generate test cases.
        </p>
        <SignInButton />
      </div>
    );
  }

  if (!session.accessToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">GitHub Repository Explorer</h2>
        <p className="text-gray-600 mb-6 text-center">
          Access token not available. Please sign out and sign in again.
        </p>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {selectedRepo && (
            <button
              onClick={() => {
                dispatch(setSelectedRepo(null));
                dispatch(clearSelectedFiles());
                dispatch(setFileContent(null));
              }}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <FaArrowLeft />
            </button>
          )}
          <h3 className="text-xl font-semibold">
            {selectedRepo ? `Repository: ${selectedRepo}` : 'Your Repositories'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-indigo-600"
            title="How to use this page"
          >
            <FaQuestionCircle className="text-xl" />
          </button>
          <SignOutButton />
        </div>
      </div>

      {/* Repository List */}
      {!selectedRepo && (
        <div>
          {repoLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading repositories...</p>
            </div>
          ) : repos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => handleRepoSelect(repo)}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <h4 className="font-semibold text-lg mb-2">{repo.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{repo.description || 'No description'}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{repo.language || 'N/A'}</span>
                    <span className="text-indigo-600">Click to explore →</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>No repositories found.</p>
            </div>
          )}
        </div>
      )}

      {/* Directory Browser */}
      {selectedRepo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* File Browser */}
          <div className="lg:col-span-1 border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {pathHistory.length > 1 && (
                  <button
                    onClick={() => dispatch(goBackInHistory())}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <FaArrowLeft />
                  </button>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {currentPath || 'Root'}
                </span>
              </div>
            </div>

            {repoLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {directoryContents.map((item) => (
                  <div
                    key={item.path}
                    onClick={() => handleItemClick(item)}
                    className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer ${
                      item.type === 'dir' ? 'font-medium' : ''
                    }`}
                  >
                    {item.type === 'dir' ? (
                      <FaFolder className="text-blue-500" />
                    ) : (
                      <FaFile className="text-gray-400" />
                    )}
                    <span className="flex-1 text-sm">{item.name}</span>
                    {selectedFiles.some(f => f.path === item.path) && (
                      <FaCheck className="text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Selected Files ({selectedFiles.length})</span>
                  <button
                    onClick={() => dispatch(clearSelectedFiles())}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file) => (
                    <div key={file.path} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                      <span className="truncate flex-1">{file.name}</span>
                      <button
                        onClick={() => dispatch(removeSelectedFile(file.path))}
                        className="text-red-600 hover:text-red-800 ml-2"
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
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-gray-700">Test Framework</label>
                    <select
                      value={testFramework}
                      onChange={(e) => dispatch(setTestFramework(e.target.value))}
                      className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="jest">Jest</option>
                      <option value="mocha">Mocha</option>
                      <option value="vitest">Vitest</option>
                      <option value="pytest">PyTest</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Test Type</label>
                    <select
                      value={testType}
                      onChange={(e) => dispatch(setTestType(e.target.value))}
                      className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="unit">Unit</option>
                      <option value="integration">Integration</option>
                      <option value="e2e">E2E</option>
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateTests}
                    disabled={isGeneratingSummaries}
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <FaMagic />
                    {isGeneratingSummaries ? 'Generating...' : 'Generate Test Cases'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* File Content & Test Cases */}
          <div className="lg:col-span-2 space-y-4">
            {/* File Content */}
            {fileContent && (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{fileContent.name}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFileSelect}
                      className={`px-3 py-1 text-white text-sm rounded ${
                        selectedFiles.some(f => f.path === fileContent.path)
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {selectedFiles.some(f => f.path === fileContent.path) ? 'Selected ✓' : 'Select File'}
                    </button>
                    <button
                      onClick={() => dispatch(setFileContent(null))}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded overflow-hidden relative">
                  <button
                    onClick={() => handleFullscreen(fileContent.content, getFileExtension(fileContent.name))}
                    className="absolute top-2 right-2 z-10 p-2 bg-gray-800 bg-opacity-75 text-white rounded hover:bg-opacity-100 transition-opacity"
                    title="Fullscreen"
                  >
                    <FaExpand />
                  </button>
                  <SyntaxHighlighter
                    language={getFileExtension(fileContent.name)}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, borderRadius: '0.5rem' }}
                    showLineNumbers={true}
                    wrapLongLines={true}
                  >
                    {fileContent.content}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}

            {/* Test Case Summaries */}
            {testCaseSummaries.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <FaCode />
                  Test Case Suggestions ({testCaseSummaries.length})
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {testCaseSummaries.map((summary) => (
                    <div
                      key={summary.id}
                      className="border border-gray-200 rounded p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{summary.description}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {summary.type}
                            </span>
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                              {summary.framework}
                            </span>
                            {summary.filePath && (
                              <span className="text-xs text-gray-500">{summary.filePath}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleGenerateTestCode(summary)}
                          disabled={isGeneratingTests}
                          className="ml-2 px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {isGeneratingTests ? 'Generating...' : 'Generate Code'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 mb-1">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                  <button
                    onClick={() => dispatch(setError(null))}
                    className="text-red-600 hover:text-red-800 ml-2"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!fileContent && testCaseSummaries.length === 0 && (
              <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 text-center">
                <p className="text-gray-600">Select a file to view its content, or generate test cases for selected files.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Code Modal */}
      {showTestModal && selectedTestForModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Generated Test Code</h3>
              <button
                onClick={() => {
                  setShowTestModal(false);
                  dispatch(setSelectedTestForModal(null));
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <p className="font-medium">{selectedTestForModal.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {selectedTestForModal.type}
                  </span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                    {selectedTestForModal.framework}
                  </span>
                </div>
              </div>
              <div className="border border-gray-200 rounded overflow-hidden relative">
                <button
                  onClick={() => handleFullscreen(selectedTestForModal.code || 'No code generated', getTestLanguage(selectedTestForModal.framework))}
                  className="absolute top-2 right-2 z-10 p-2 bg-gray-800 bg-opacity-75 text-white rounded hover:bg-opacity-100 transition-opacity"
                  title="Fullscreen"
                >
                  <FaExpand />
                </button>
                <SyntaxHighlighter
                  language={getTestLanguage(selectedTestForModal.framework)}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, borderRadius: '0.5rem' }}
                  showLineNumbers={true}
                  wrapLongLines={true}
                >
                  {selectedTestForModal.code || 'No code generated'}
                </SyntaxHighlighter>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedTestForModal.code);
                  alert('Test code copied to clipboard!');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Copy Code
              </button>
              <button
                onClick={() => {
                  setShowTestModal(false);
                  dispatch(setSelectedTestForModal(null));
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
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
          <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
            <h3 className="text-white font-semibold">Code Viewer (Fullscreen)</h3>
            <button
              onClick={handleExitFullscreen}
              className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <FaCompress />
              Exit Fullscreen (ESC)
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <SyntaxHighlighter
              language={fullscreenLanguage}
              style={vscDarkPlus}
              customStyle={{ margin: 0, borderRadius: '0.5rem' }}
              showLineNumbers={true}
              wrapLongLines={true}
            >
              {fullscreenContent}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FaInfoCircle className="text-indigo-600" />
                How to Use This Application
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <section>
                  <h4 className="text-lg font-semibold mb-3 text-indigo-600">Getting Started</h4>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li><strong>Sign In:</strong> Click the "Sign in with GitHub" button to authenticate using your GitHub account.</li>
                    <li><strong>View Repositories:</strong> After signing in, you'll see a list of your GitHub repositories.</li>
                    <li><strong>Select Repository:</strong> Click on any repository card to explore its contents.</li>
                  </ol>
                </section>

                <section>
                  <h4 className="text-lg font-semibold mb-3 text-indigo-600">Exploring Files</h4>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li><strong>Navigate Directories:</strong> Click on folder icons to browse through directories.</li>
                    <li><strong>View Files:</strong> Click on file icons to view their content with syntax highlighting.</li>
                    <li><strong>Select Files:</strong> Click the "Select File" button on any file to add it to your selection for test generation.</li>
                    <li><strong>Fullscreen Mode:</strong> Click the expand icon (⛶) in the top-right corner of any code display to view it in fullscreen mode.</li>
                    <li><strong>Go Back:</strong> Use the back arrow button to navigate back through directories or return to the repository list.</li>
                  </ol>
                </section>

                <section>
                  <h4 className="text-lg font-semibold mb-3 text-indigo-600">Generating Test Cases</h4>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li><strong>Select Files:</strong> Select one or more files that you want to generate tests for.</li>
                    <li><strong>Choose Framework:</strong> Select your preferred test framework (Jest, Mocha, pytest, etc.) from the dropdown.</li>
                    <li><strong>Choose Test Type:</strong> Select the type of tests you want (Unit, Integration, E2E, etc.).</li>
                    <li><strong>Generate:</strong> Click the "Generate Test Cases" button to create test case suggestions.</li>
                    <li><strong>Review Suggestions:</strong> Browse through the generated test case suggestions.</li>
                    <li><strong>Generate Code:</strong> Click "Generate Code" on any test case suggestion to generate the actual test code.</li>
                    <li><strong>Copy Code:</strong> Use the "Copy Code" button in the test code modal to copy the generated code to your clipboard.</li>
                  </ol>
                </section>

                <section>
                  <h4 className="text-lg font-semibold mb-3 text-indigo-600">Features</h4>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li><strong>Syntax Highlighting:</strong> Code is displayed with proper syntax highlighting based on file type.</li>
                    <li><strong>Line Numbers:</strong> All code displays include line numbers for easy reference.</li>
                    <li><strong>Fullscreen Mode:</strong> View code in fullscreen for better readability (Press ESC to exit).</li>
                    <li><strong>Multiple Languages:</strong> Supports 40+ programming languages and test frameworks.</li>
                    <li><strong>Smart Detection:</strong> Automatically detects the correct language based on file extension or test framework.</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-lg font-semibold mb-3 text-indigo-600">Keyboard Shortcuts</h4>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li><strong>ESC:</strong> Exit fullscreen mode</li>
                    <li><strong>Click Expand Icon:</strong> Enter fullscreen mode for code display</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-lg font-semibold mb-3 text-indigo-600">Tips</h4>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Select multiple related files to generate comprehensive test cases.</li>
                    <li>Make sure files have content loaded before generating tests (click on files to load them first).</li>
                    <li>Use fullscreen mode for better code readability, especially for long files.</li>
                    <li>The application uses AI to generate test cases, so results may vary based on code complexity.</li>
                  </ul>
                </section>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
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
