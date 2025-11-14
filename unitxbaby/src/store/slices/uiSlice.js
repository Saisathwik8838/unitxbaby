import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  loading: false,
  error: null,
  isFullScreen: false,
  showTestSection: false,
  showSummarySection: false,
  isGeneratingSummaries: false,
  isGeneratingTests: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setIsFullScreen: (state, action) => {
      state.isFullScreen = action.payload;
    },
    setShowTestSection: (state, action) => {
      state.showTestSection = action.payload;
    },
    setShowSummarySection: (state, action) => {
      state.showSummarySection = action.payload;
    },
    setIsGeneratingSummaries: (state, action) => {
      state.isGeneratingSummaries = action.payload;
    },
    setIsGeneratingTests: (state, action) => {
      state.isGeneratingTests = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setIsFullScreen,
  setShowTestSection,
  setShowSummarySection,
  setIsGeneratingSummaries,
  setIsGeneratingTests,
  clearError,
} = uiSlice.actions;

export default uiSlice.reducer;

