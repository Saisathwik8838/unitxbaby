import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
  fileContent: null,
  selectedFiles: [],
  selectedCode: '',
};

export const fetchFileContent = createAsyncThunk(
  'file/fetchFileContent',
  async ({ owner, repo, path, accessToken }) => {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch file content');
    }
    const data = await response.json();
    
    if (data.size > 1000000) {
      throw new Error('File is too large to display (>1MB)');
    }
    
    // Decode base64 content
    let decodedContent;
    try {
      // GitHub API returns base64 encoded content with newlines, remove them
      const base64Content = data.content.replace(/\s/g, '');
      decodedContent = atob(base64Content);
    } catch (decodeError) {
      throw new Error('Failed to decode file content');
    }
    
    // Check if binary (check first 1000 chars)
    const sample = decodedContent.substring(0, Math.min(1000, decodedContent.length));
    const isBinary = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(sample);
    
    if (isBinary) {
      return {
        content: `Binary file: ${data.name} (${data.size} bytes)`,
        name: data.name,
        path: data.path,
      };
    }
    
    return {
      content: decodedContent,
      name: data.name,
      path: data.path,
    };
  }
);

const fileSlice = createSlice({
  name: 'file',
  initialState,
  reducers: {
    setFileContent: (state, action) => {
      state.fileContent = action.payload;
    },
    setSelectedCode: (state, action) => {
      state.selectedCode = action.payload;
    },
    addSelectedFile: (state, action) => {
      const exists = state.selectedFiles.some(f => f.path === action.payload.path);
      if (!exists) {
        // Ensure we have content, name, and path
        state.selectedFiles.push({
          path: action.payload.path,
          name: action.payload.name,
          content: action.payload.content || '',
        });
      }
    },
    removeSelectedFile: (state, action) => {
      state.selectedFiles = state.selectedFiles.filter(f => f.path !== action.payload);
    },
    clearSelectedFiles: (state) => {
      state.selectedFiles = [];
    },
    clearFileContent: (state) => {
      state.fileContent = null;
      state.selectedCode = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFileContent.fulfilled, (state, action) => {
        state.fileContent = action.payload;
      });
  },
});

export const {
  setFileContent,
  setSelectedCode,
  addSelectedFile,
  removeSelectedFile,
  clearSelectedFiles,
  clearFileContent,
} = fileSlice.actions;

export default fileSlice.reducer;

