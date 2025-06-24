// Configuration file for API keys and settings
export const CONFIG = {
    // OpenRouter API Key - replace with your actual API key
    // In production, this should be stored securely on the server side
    OPENROUTER_API_KEY: import.meta.env.VITE_OPENROUTER_API_KEY,
    
    // Default AI model to use
    DEFAULT_MODEL: 'mistralai/mistral-7b-instruct:free',
    
    // API endpoints
    OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions'
};

// Function to get API key (allows for environment variable override)
export function getApiKey() {
    // Check for environment variable first (for server-side usage)
    if (typeof process !== 'undefined' && process.env && process.env.OPENROUTER_API_KEY) {
        return process.env.OPENROUTER_API_KEY;
    }
    
    // Fall back to config value
    return CONFIG.OPENROUTER_API_KEY;
} 