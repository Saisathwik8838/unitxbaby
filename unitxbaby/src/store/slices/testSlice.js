import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
  testCaseSummaries: [],
  generatedTests: [],
  testFramework: 'jest',
  testType: 'unit',
  selectedTestForModal: null,
  prUrl: null,
};

export const generateTestSummaries = createAsyncThunk(
  'test/generateTestSummaries',
  async ({ selectedFiles, testFramework, testType }, { rejectWithValue }) => {
    try {
      console.log('Generating test summaries for:', {
        fileCount: selectedFiles.length,
        files: selectedFiles.map(f => ({ path: f.path, hasContent: !!f.content, contentLength: f.content?.length || 0 })),
        testFramework,
        testType
      });

      const filesContent = selectedFiles.map(f => `File: ${f.path}\n${f.content}`).join('\n\n---\n\n');
      const prompt = `Analyze the following code files and suggest test cases. Framework: ${testFramework}, Type: ${testType}\n\n${filesContent}\n\nIMPORTANT: You must respond with ONLY a valid JSON array, no other text or markdown. The response must be an array of objects, not an object containing an array.\n\nFormat: [{"id": "unique-id", "description": "test description", "type": "${testType}", "framework": "${testFramework}", "filePath": "file/path.js"}]\n\nReturn ONLY the JSON array, nothing else.`;
      
      console.log('Sending request to /api/openai, prompt length:', prompt.length);
      
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 2000 }),
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Error response:', errorData);
        } catch (e) {
          const text = await response.text();
          console.error('Error response (text):', text);
          errorData = { error: text || `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || errorData.details || errorData.last_error || `HTTP ${response.status}: Failed to generate test summaries`);
      }
      
      const data = await response.json();
      console.log('API response:', { hasResult: !!data.result, resultType: typeof data.result, resultLength: data.result?.length });
      
      if (data.error) {
        throw new Error(data.error || 'Failed to generate test summaries');
      }
      
      if (!data.result) {
        throw new Error('No result returned from API');
      }
      
      // Helper function to fix malformed JSON
      const fixMalformedJSON = (jsonString) => {
        if (typeof jsonString !== 'string') return jsonString;
        
        // Remove markdown code blocks if present
        jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
        
        // First, try to extract JSON array using balanced bracket matching
        const extractJSONArray = (str) => {
          let depth = 0;
          let start = -1;
          let inString = false;
          let escapeNext = false;
          
          for (let i = 0; i < str.length; i++) {
            const char = str[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            
            if (char === '"') {
              inString = !inString;
              continue;
            }
            
            if (inString) continue;
            
            if (char === '[') {
              if (start === -1) start = i;
              depth++;
            } else if (char === ']') {
              depth--;
              if (depth === 0 && start !== -1) {
                return str.substring(start, i + 1);
              }
            }
          }
          
          return null;
        };
        
        // Try to extract array first
        let extracted = extractJSONArray(jsonString);
        if (!extracted) {
          // Fallback to regex if balanced matching fails
          const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
          extracted = arrayMatch ? arrayMatch[0] : jsonString;
        }
        
        // Fix unterminated strings in the extracted JSON
        let fixed = extracted;
        let inString = false;
        let escapeNext = false;
        let stringStart = -1;
        const fixes = [];
        
        for (let i = 0; i < fixed.length; i++) {
          const char = fixed[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"') {
            if (inString) {
              inString = false;
              stringStart = -1;
            } else {
              inString = true;
              stringStart = i;
            }
          }
          
          // If we're at the end and still in a string, we need to close it
          if (i === fixed.length - 1 && inString && stringStart >= 0) {
            // Close the string at the end
            fixes.push({ pos: fixed.length, char: '"' });
          }
        }
        
        // Apply fixes in reverse order
        fixes.reverse().forEach(fix => {
          fixed = fixed.substring(0, fix.pos) + fix.char + fixed.substring(fix.pos);
        });
        
        // Fix trailing commas
        fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
        
        // Try to fix unterminated strings by scanning backwards from structural characters
        const structuralChars = [',', '}', ']'];
        for (let i = fixed.length - 1; i >= 0; i--) {
          if (structuralChars.includes(fixed[i])) {
            // Scan backwards to find if we're in an unterminated string
            let inStr = false;
            let esc = false;
            for (let j = i - 1; j >= 0; j--) {
              if (esc) {
                esc = false;
                continue;
              }
              if (fixed[j] === '\\') {
                esc = true;
                continue;
              }
              if (fixed[j] === '"') {
                inStr = !inStr;
                if (!inStr) break; // Found matching quote
              }
            }
            if (inStr && fixed[i - 1] !== '"') {
              // Insert closing quote before this structural character
              fixed = fixed.substring(0, i) + '"' + fixed.substring(i);
            }
          }
        }
        
        return fixed;
      };
      
      // Try to parse JSON, handle if it's already an object or needs parsing
      let parsedResult;
      try {
        const resultToParse = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
        parsedResult = JSON.parse(resultToParse);
        console.log('Parsed result:', { isArray: Array.isArray(parsedResult), isObject: typeof parsedResult === 'object', keys: parsedResult && typeof parsedResult === 'object' ? Object.keys(parsedResult) : null });
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.log('Raw result (first 500 chars):', typeof data.result === 'string' ? data.result.substring(0, 500) : data.result);
        
        try {
          // Try to fix malformed JSON
          const fixedJSON = fixMalformedJSON(typeof data.result === 'string' ? data.result : JSON.stringify(data.result));
          parsedResult = JSON.parse(fixedJSON);
          console.log('Successfully parsed after fixing malformed JSON');
        } catch (fixError) {
          console.error('Failed to fix JSON:', fixError);
          console.error('Original parse error:', parseError);
          
          // Log more details about the response for debugging
          const errorMsg = parseError?.message || String(parseError);
          const positionMatch = errorMsg.match(/position (\d+)/);
          const errorPosition = positionMatch ? parseInt(positionMatch[1], 10) : null;
          const resultPreview = typeof data.result === 'string' 
            ? (errorPosition 
                ? data.result.substring(Math.max(0, errorPosition - 100), Math.min(data.result.length, errorPosition + 100))
                : data.result.substring(0, 200))
            : 'Non-string result';
          console.error('Response around error position:', resultPreview);
          console.error('Full response length:', typeof data.result === 'string' ? data.result.length : 'N/A');
          
          // Try to extract JSON array from the string using multiple strategies
          let jsonMatch = null;
          
          // Strategy 1: Simple regex match
          if (typeof data.result === 'string') {
            jsonMatch = data.result.match(/\[[\s\S]*\]/);
          }
          
          // Strategy 2: Try to find array start and manually extract
          if (!jsonMatch && typeof data.result === 'string') {
            const arrayStart = data.result.indexOf('[');
            if (arrayStart !== -1) {
              // Try to find a reasonable end point
              let depth = 0;
              let inString = false;
              let escapeNext = false;
              let endPos = -1;
              
              for (let i = arrayStart; i < data.result.length; i++) {
                const char = data.result[i];
                
                if (escapeNext) {
                  escapeNext = false;
                  continue;
                }
                
                if (char === '\\') {
                  escapeNext = true;
                  continue;
                }
                
                if (char === '"') {
                  inString = !inString;
                  continue;
                }
                
                if (inString) continue;
                
                if (char === '[') depth++;
                if (char === ']') {
                  depth--;
                  if (depth === 0) {
                    endPos = i;
                    break;
                  }
                }
              }
              
              if (endPos !== -1) {
                jsonMatch = [data.result.substring(arrayStart, endPos + 1)];
              }
            }
          }
          
          if (jsonMatch && jsonMatch[0]) {
            try {
              // Try to fix the extracted JSON one more time
              const reFixed = fixMalformedJSON(jsonMatch[0]);
              parsedResult = JSON.parse(reFixed);
              console.log('Successfully extracted and parsed array from string');
            } catch (extractError) {
              console.error('Failed to extract JSON:', extractError);
              console.error('Extracted JSON preview:', jsonMatch[0].substring(0, 500));
              throw new Error(`Invalid JSON response from API: ${parseError.message}. Could not fix malformed JSON. Response preview: ${resultPreview}`);
            }
          } else {
            throw new Error(`Invalid JSON response from API: ${parseError.message}. Could not extract valid JSON array. Response preview: ${resultPreview}`);
          }
        }
      }
      
      // Handle cases where API returns an object instead of array
      if (!Array.isArray(parsedResult)) {
        console.log('Result is not an array, attempting to extract array from object:', parsedResult);
        
        // Try to find an array in common property names
        const possibleArrayKeys = ['testCases', 'tests', 'cases', 'items', 'results', 'data', 'array'];
        for (const key of possibleArrayKeys) {
          if (parsedResult[key] && Array.isArray(parsedResult[key])) {
            console.log(`Found array in property: ${key}`);
            parsedResult = parsedResult[key];
            break;
          }
        }
        
        // If still not an array, check if the object itself should be converted
        // (e.g., if it has test case properties)
        if (!Array.isArray(parsedResult)) {
          // Check if it's a single test case object that should be wrapped in an array
          if (parsedResult && typeof parsedResult === 'object' && (parsedResult.description || parsedResult.id)) {
            console.log('Single test case object detected, wrapping in array');
            parsedResult = [parsedResult];
          } else {
            // Try to extract array from nested structures
            const findArray = (obj) => {
              if (Array.isArray(obj)) return obj;
              if (obj && typeof obj === 'object') {
                for (const value of Object.values(obj)) {
                  if (Array.isArray(value)) return value;
                  if (value && typeof value === 'object') {
                    const found = findArray(value);
                    if (found) return found;
                  }
                }
              }
              return null;
            };
            
            const foundArray = findArray(parsedResult);
            if (foundArray) {
              console.log('Found nested array in object structure');
              parsedResult = foundArray;
            } else {
              console.error('Result is not an array and could not extract one:', parsedResult);
              throw new Error('Expected array of test cases, got: ' + typeof parsedResult + '. Response structure: ' + JSON.stringify(parsedResult).substring(0, 200));
            }
          }
        }
      }
      
      console.log('Successfully generated', parsedResult.length, 'test cases');
      return parsedResult;
    } catch (error) {
      console.error('Test generation error:', error);
      return rejectWithValue(error.message || 'Failed to generate test summaries');
    }
  }
);

export const generateTestCode = createAsyncThunk(
  'test/generateTestCode',
  async ({ summary, selectedFiles, testFramework, testType }) => {
    const filesContent = selectedFiles.map(f => `File: ${f.path}\n${f.content}`).join('\n\n---\n\n');
    const prompt = `Generate complete test code for: ${summary.description}\nFramework: ${testFramework}, Type: ${testType}\n\nCode files:\n${filesContent}\n\nProvide only the test code, no explanations.`;
    
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens: 2000 }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate test code');
    }
    
    const data = await response.json();
    return {
      ...summary,
      code: data.result,
    };
  }
);

const testSlice = createSlice({
  name: 'test',
  initialState,
  reducers: {
    setTestFramework: (state, action) => {
      state.testFramework = action.payload;
    },
    setTestType: (state, action) => {
      state.testType = action.payload;
    },
    setSelectedTestForModal: (state, action) => {
      state.selectedTestForModal = action.payload;
    },
    setPrUrl: (state, action) => {
      state.prUrl = action.payload;
    },
    clearTests: (state) => {
      state.testCaseSummaries = [];
      state.generatedTests = [];
      state.selectedTestForModal = null;
      state.prUrl = null;
    },
    addGeneratedTest: (state, action) => {
      const exists = state.generatedTests.some(t => t.id === action.payload.id);
      if (!exists) {
        state.generatedTests.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateTestSummaries.pending, (state) => {
        // Loading handled in UI slice
      })
      .addCase(generateTestSummaries.fulfilled, (state, action) => {
        state.testCaseSummaries = action.payload.map((item, index) => ({
          id: item.id || `summary-${Date.now()}-${index}`,
          description: item.description,
          type: item.type,
          framework: item.framework || state.testFramework,
          filePath: item.filePath,
        }));
      })
      .addCase(generateTestSummaries.rejected, (state, action) => {
        console.error('Test summaries generation rejected:', action);
        // Error handled in UI slice
      })
      .addCase(generateTestCode.pending, (state) => {
        // Loading handled in UI slice
      })
      .addCase(generateTestCode.fulfilled, (state, action) => {
        const newTest = {
          ...action.payload,
          id: action.payload.id || `test-${Date.now()}`,
          status: 'generated',
        };
        const exists = state.generatedTests.some(t => t.id === newTest.id);
        if (!exists) {
          state.generatedTests.push(newTest);
        }
        state.selectedTestForModal = newTest;
      })
      .addCase(generateTestCode.rejected, (state) => {
        // Error handled in UI slice
      });
  },
});

export const {
  setTestFramework,
  setTestType,
  setSelectedTestForModal,
  setPrUrl,
  clearTests,
  addGeneratedTest,
} = testSlice.actions;

export default testSlice.reducer;

