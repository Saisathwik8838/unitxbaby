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
        
        // Try to fix unterminated strings by finding and closing them
        let fixed = jsonString;
        let inString = false;
        let escapeNext = false;
        let lastQuotePos = -1;
        
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
              lastQuotePos = i;
              inString = false;
            } else {
              inString = true;
              lastQuotePos = i;
            }
          }
        }
        
        // If string is unterminated, close it
        if (inString && lastQuotePos >= 0) {
          // Find the position where the string should end (before next comma, bracket, or brace)
          const nextComma = fixed.indexOf(',', lastQuotePos + 1);
          const nextBracket = fixed.indexOf(']', lastQuotePos + 1);
          const nextBrace = fixed.indexOf('}', lastQuotePos + 1);
          
          let insertPos = fixed.length;
          if (nextComma > lastQuotePos) insertPos = Math.min(insertPos, nextComma);
          if (nextBracket > lastQuotePos) insertPos = Math.min(insertPos, nextBracket);
          if (nextBrace > lastQuotePos) insertPos = Math.min(insertPos, nextBrace);
          
          fixed = fixed.substring(0, insertPos) + '"' + fixed.substring(insertPos);
        }
        
        // Try to extract valid JSON array
        const arrayMatch = fixed.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          return arrayMatch[0];
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
          
          // Try to extract JSON array from the string
          const jsonMatch = typeof data.result === 'string' 
            ? data.result.match(/\[[\s\S]*\]/) 
            : null;
          
          if (jsonMatch) {
            try {
              parsedResult = JSON.parse(jsonMatch[0]);
              console.log('Successfully extracted array from string');
            } catch (extractError) {
              // Last resort: try to manually construct array from partial JSON
              console.error('Failed to extract JSON:', extractError);
              throw new Error(`Invalid JSON response from API: ${parseError.message}. Could not fix malformed JSON.`);
            }
          } else {
            throw new Error(`Invalid JSON response from API: ${parseError.message}. Could not extract valid JSON array.`);
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

