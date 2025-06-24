# Resume Analysis Module Setup

This module provides AI-powered resume analysis using OpenRouter's API. It analyzes resumes against job descriptions and provides detailed feedback including strengths, weaknesses, and an overall assessment.

## Setup Instructions

### 1. Get an OpenRouter API Key

1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to your API keys section
4. Create a new API key
5. Copy the API key

### 2. Configure the API Key

Open `config.js` and replace `YOUR_OPENROUTER_API_KEY_HERE` with your actual API key:

```javascript
export const CONFIG = {
    OPENROUTER_API_KEY: 'your_actual_api_key_here',
    // ... other config
};
```

### 3. Usage

The module provides two main functions:

#### `getResumeFeedback(resume, jobDescription, customInstructions, model)`

- `resume` (string): The resume text content
- `jobDescription` (string): The job description text  
- `customInstructions` (string, optional): Custom AI instructions
- `model` (string, optional): AI model to use (default: "mistralai/mistral-7b-instruct:free")

Returns a promise that resolves to:
```javascript
{
  success: true,
  data: {
    score: 85,
    strengths: ["Strong technical background", "Relevant experience"],
    weaknesses: ["Limited leadership experience"],
    assessment: "Overall assessment text..."
  }
}
```

#### `analyzeResume(resume, jobDescription)`

Simplified version with default parameters.

### 4. Integration

The module is already integrated into the dashboard. When adding a resume:

1. Enter the applicant name
2. Either upload a resume file OR paste resume text
3. Click "Analyze Resume"
4. The AI will analyze the resume against the job description and provide feedback

### 5. Error Handling

The module includes comprehensive error handling:
- Validates required inputs
- Handles API errors gracefully
- Provides fallback parsing for non-JSON responses
- Shows user-friendly error messages

### 6. Security Notes

- Never commit your API key to version control
- In production, store API keys securely on the server side
- Consider implementing rate limiting for API calls

### 7. Available Models

You can use any model available on OpenRouter. Some popular options:
- `mistralai/mistral-7b-instruct:free` (default, free tier)
- `openai/gpt-3.5-turbo` (paid)
- `anthropic/claude-3-haiku` (paid)
- `google/gemini-pro` (paid)

### 8. Customization

You can customize the AI prompts by modifying the `systemPrompt` and `userPrompt` in `resumeAnalysis.js`. The current prompts are designed to:

- Provide structured JSON responses
- Include score, strengths, weaknesses, and assessment
- Handle various resume formats
- Provide actionable feedback

## Troubleshooting

### Common Issues

1. **"API key is not configured"**: Make sure you've set your API key in `config.js`
2. **"API request failed"**: Check your internet connection and API key validity
3. **"Invalid response format"**: The AI response couldn't be parsed as JSON (fallback parsing will be used)

### Debug Mode

To enable debug logging, add this to your browser console:
```javascript
localStorage.setItem('debugResumeAnalysis', 'true');
```

This will log detailed information about API requests and responses. 