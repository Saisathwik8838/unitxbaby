import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Initialize Google AI client - will be initialized on first request
let googleAI = null;

function initializeGoogleAI() {
  if (googleAI) return googleAI;
  
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_API_KEY not found in environment variables');
      return null;
    }
    
    console.log('Initializing Google AI client with API key:', apiKey.substring(0, 10) + '...');
    googleAI = new GoogleGenerativeAI(apiKey);
    console.log('Google AI client initialized successfully');
    return googleAI;
  } catch (error) {
    console.error('Failed to initialize Google AI client:', error);
    console.error('Error details:', error.message, error.stack);
    return null;
  }
}

// Gemini model priority list
// Updated: Google has deprecated gemini-1.5 models and now only supports Gemini 2.x models
// Models must include the "models/" prefix for the API
const GEMINI_MODELS = [
  'models/gemini-2.5-flash',        // Latest flash model - best for free tier
  'models/gemini-2.5-pro',           // Latest pro model
  'models/gemini-2.0-flash',         // 2.0 flash model
  'models/gemini-2.0-flash-001',    // 2.0 flash variant
  'models/gemini-2.0-flash-lite-001' // Lite variant
];

// Helper function to list available models (for debugging)
async function listAvailableModels() {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return [];
    
    // Try v1 API first
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    if (response.ok) {
      const data = await response.json();
      return data.models?.map((m) => m.name) || [];
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
  return [];
}

// Helper function to try REST API v1 directly
async function tryRestAPIv1(modelName, prompt, maxTokens, temperature) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'No API key' };
    }

    const cleanModelName = modelName.replace(/^models\//, '');
    const restResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${cleanModelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: Math.min(maxTokens, 8192),
            temperature: Math.max(0, Math.min(2, temperature))
          }
        })
      }
    );

    if (restResponse.ok) {
      const restData = await restResponse.json();
      const text = restData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (text) {
        let cleanedResult = text;
        cleanedResult = cleanedResult.replace(/```json\s*/, '').replace(/```\s*$/, '');
        cleanedResult = cleanedResult.trim();
        
        return {
          success: true,
          result: {
            text: cleanedResult,
            usageMetadata: restData.usageMetadata
          }
        };
      }
    } else {
      const errorData = await restResponse.json();
      return { success: false, error: errorData };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
  
  return { success: false, error: 'Unknown error' };
}

router.post('/', async (req, res) => {
  console.log('Received request to /api/openai');
  console.log('GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
  
  if (!process.env.GOOGLE_API_KEY) {
    console.error('Google API key not configured');
    return res.status(500).json({ error: "Google API key not configured" });
  }

  // Initialize Google AI client if not already initialized
  const client = initializeGoogleAI();
  if (!client) {
    console.error('Google AI client initialization failed');
    return res.status(500).json({ error: "Google AI client initialization failed. Please check your GOOGLE_API_KEY." });
  }

  try {
    const { 
      prompt, 
      maxTokens = 1000, 
      temperature = 0.7, 
      systemPrompt = "You are a helpful assistant that generates test cases for code. Always respond with valid JSON only, without any markdown formatting, explanations, or code blocks.",
      model
    } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: "Prompt is required and cannot be empty" });
    }

    // Combine system prompt and user prompt
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;

    // First, try to get available models and use them if possible
    const availableModels = await listAvailableModels();
    let modelsToTry = [];
    
    if (model) {
      modelsToTry = [model];
    } else if (availableModels.length > 0) {
      // Filter to only Gemini models that support generateContent
      const geminiModels = availableModels.filter((m) => 
        m.includes('gemini') && !m.includes('embedding')
      );
      if (geminiModels.length > 0) {
        modelsToTry = geminiModels.slice(0, 3); // Use first 3 available
      } else {
        modelsToTry = GEMINI_MODELS; // Fallback to hardcoded
      }
    } else {
      modelsToTry = GEMINI_MODELS; // Fallback to hardcoded
    }

    console.log(`Attempting to generate content with ${modelsToTry.length} model(s)`);
    console.log(`Prompt length: ${prompt.length} characters`);

    let lastError = null;

    // Try SDK first for each model
    for (const modelName of modelsToTry) {
      try {
        // SDK may accept model names with or without "models/" prefix
        // Try with prefix first (as required by newer API)
        const modelNameForSDK = modelName.includes('/') ? modelName : `models/${modelName}`;
        const cleanModelName = modelName.replace(/^models\//, ''); // For REST API URL
        console.log(`Attempting SDK with model: ${modelNameForSDK}`);
        
        const genModel = client.getGenerativeModel({ 
          model: modelNameForSDK,
          generationConfig: {
            maxOutputTokens: Math.min(maxTokens, 8192),
            temperature: Math.max(0, Math.min(2, temperature))
          }
        });

        const result = await genModel.generateContent(fullPrompt);
        const response = await result.response;
        
        if (!response.text()) {
          throw new Error('Empty response received');
        }

        let cleanedResult = response.text();
        cleanedResult = cleanedResult.replace(/```json\s*/, '').replace(/```\s*$/, '');
        cleanedResult = cleanedResult.trim();

        console.log(`Successfully generated content with model: ${cleanModelName}`);
        console.log(`Result length: ${cleanedResult.length} characters`);

        return res.json({
          result: cleanedResult,
          model_used: cleanModelName,
          method: 'SDK',
          tokens_used: response.usageMetadata?.totalTokenCount || 0,
          input_tokens: response.usageMetadata?.promptTokenCount || 0,
          output_tokens: response.usageMetadata?.candidatesTokenCount || 0
        });

      } catch (error) {
        console.warn(`SDK model ${modelName} failed:`, error.message);
        lastError = error;
        
        // Don't retry if it's a quota/rate limit error
        if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
          continue;
        }
        
        // Don't retry if it's a content policy violation
        if (error.message?.includes('SAFETY') || error.message?.includes('blocked')) {
          return res.status(400).json({ 
            error: "Content blocked by safety filters",
            details: error.message 
          });
        }
      }
    }

    // If SDK failed, try REST API v1 for all models
    console.log('SDK methods failed, trying REST API v1 for all models...');
    for (const modelName of modelsToTry) {
      const cleanModelName = modelName.replace(/^models\//, '');
      console.log(`Attempting REST API v1 with model: ${cleanModelName}`);
      
      const restResult = await tryRestAPIv1(cleanModelName, fullPrompt, maxTokens, temperature);
      
      if (restResult.success && restResult.result) {
        return res.json({
          result: restResult.result.text,
          model_used: cleanModelName,
          method: 'REST API v1',
          tokens_used: restResult.result.usageMetadata?.totalTokenCount || 0,
          input_tokens: restResult.result.usageMetadata?.promptTokenCount || 0,
          output_tokens: restResult.result.usageMetadata?.candidatesTokenCount || 0
        });
      } else {
        console.warn(`REST API v1 model ${cleanModelName} failed:`, restResult.error);
        if (restResult.error) {
          lastError = restResult.error;
        }
      }
    }

    // If all methods failed, return detailed error
    // Use already fetched availableModels, or fetch again if empty
    const finalAvailableModels = availableModels.length > 0 ? availableModels : await listAvailableModels();
    
    // Provide user-friendly error message
    let errorMessage = "All models failed";
    if (lastError?.message?.includes('quota') || lastError?.message?.includes('429') || lastError?.error?.message?.includes('quota')) {
      errorMessage = "API quota exceeded. Your Google API key has reached its free tier limit. Please check your Google Cloud billing or wait before retrying.";
    } else {
      errorMessage = lastError?.message || lastError?.error?.message || "Unknown error";
    }
    
    return res.status(503).json({
      error: errorMessage,
      last_error: lastError?.message || lastError?.error?.message || "Unknown error",
      attempted_models: modelsToTry,
      available_models_from_api: finalAvailableModels.length > 0 ? finalAvailableModels : "Could not fetch available models",
      suggestion: finalAvailableModels.length > 0 
        ? `Try using one of these available models: ${finalAvailableModels.slice(0, 5).join(', ')}`
        : "Try adjusting your prompt or reducing maxTokens. Also verify your API key has access to Generative Language API and that the models are enabled in your Google Cloud project."
    });

  } catch (error) {
    console.error('API Handler Error:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      error: "Processing error",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

export default router;
