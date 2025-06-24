/**
 * Resume Analysis Module
 * Provides AI-powered resume analysis using OpenRouter API
 */

import { getApiKey, CONFIG } from './config.js';

// Token estimation (rough approximation: 1 token ≈ 4 characters)
const TOKENS_PER_CHAR = 0.25;
const MAX_TOKENS = 30000; // Leave some buffer for response
const MAX_INPUT_TOKENS = 25000; // Conservative limit for input

/**
 * Analyzes a resume against a job description using AI
 * @param {string} resume - The resume text content
 * @param {string} jobDescription - The job description text
 * @param {string} customInstructions - Optional custom AI instructions
 * @param {string} model - The AI model to use (default: "mistralai/mistral-7b-instruct:free")
 * @returns {Promise<Object>} Analysis result with score, strengths, weaknesses, and assessment
 */
export async function getResumeFeedback(resume, jobDescription, customInstructions = '', model = CONFIG.DEFAULT_MODEL) {
    try {
        // Validate inputs
        if (!resume || !jobDescription) {
            throw new Error('Resume and job description are required');
        }

        const apiKey = getApiKey();
        if (!apiKey || apiKey === 'YOUR_OPENROUTER_API_KEY_HERE') {
            throw new Error('OpenRouter API key is not configured. Please set your API key in config.js');
        }

        // Compress and prepare the text inputs
        const compressedResume = compressResumeText(resume);
        const compressedJobDescription = compressJobDescription(jobDescription);
        const compressedInstructions = customInstructions ? compressInstructions(customInstructions) : '';

        // Estimate token count
        const estimatedTokens = estimateTokenCount(compressedResume, compressedJobDescription, compressedInstructions);
        
        if (estimatedTokens > MAX_INPUT_TOKENS) {
            // If still too long, use chunking strategy
            return await analyzeWithChunking(resume, jobDescription, customInstructions, model);
        }

        // Construct the system prompt
        let systemPrompt = `You are a resume analyzer. Respond with JSON only.`;
        
        if (compressedInstructions) {
            systemPrompt += `\n\nAdditional Instructions: ${compressedInstructions}`;
        }

        // Construct the user prompt
        const userPrompt = `Analyze this resume against the job description. Return ONLY a JSON object with this exact structure:

        {
          "score": 75,
          "strengths": ["strength 1", "strength 2", "strength 3"],
          "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
          "assessment": "brief assessment here"
        }

        Resume: ${compressedResume}

        Job: ${compressedJobDescription}`;

        // Make the API request
        const response = await fetch(CONFIG.OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin || 'http://localhost:3000',
                'X-Title': 'Recrootly Resume Analysis'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from API');
        }

        const assistantResponse = data.choices[0].message.content;

        // Try to parse the JSON response
        try {
            const parsedResponse = JSON.parse(assistantResponse);
            
            // Validate the parsed response has the expected structure
            if (typeof parsedResponse.score !== 'number' || 
                !Array.isArray(parsedResponse.strengths) || 
                !Array.isArray(parsedResponse.weaknesses) || 
                typeof parsedResponse.assessment !== 'string') {
                throw new Error('Invalid response structure');
            }

            return {
                success: true,
                data: parsedResponse
            };
        } catch (parseError) {
            // If JSON parsing fails, try to extract information from plain text
            console.warn('Failed to parse JSON response, attempting to extract from text:', parseError);
            
            return {
                success: true,
                data: {
                    score: extractScoreFromText(assistantResponse),
                    strengths: extractStrengthsFromText(assistantResponse),
                    weaknesses: extractWeaknessesFromText(assistantResponse),
                    assessment: extractAssessmentFromText(assistantResponse),
                    rawResponse: assistantResponse
                }
            };
        }

    } catch (error) {
        console.error('Resume analysis error:', error);
        return {
            success: false,
            error: error.message,
            data: {
                score: 0,
                strengths: ['Analysis failed'],
                weaknesses: ['Unable to process resume'],
                assessment: 'Error occurred during analysis. Please try again.'
            }
        };
    }
}

/**
 * Compress resume text by removing redundant information and keeping key details
 * @param {string} resume - Original resume text
 * @returns {string} Compressed resume text
 */
function compressResumeText(resume) {
    if (!resume) return '';
    
    // Remove extra whitespace and normalize
    let compressed = resume.replace(/\s+/g, ' ').trim();
    
    // If still too long, extract key sections
    if (compressed.length > 8000) {
        const sections = extractResumeSections(compressed);
        compressed = sections.join('\n\n');
    }
    
    // Final length check
    if (compressed.length > 6000) {
        compressed = compressed.substring(0, 6000) + '... [Content truncated for length]';
    }
    
    return compressed;
}

/**
 * Extract key sections from resume
 * @param {string} resume - Resume text
 * @returns {Array<string>} Key sections
 */
function extractResumeSections(resume) {
    const sections = [];
    
    // Add null/undefined check
    if (!resume || typeof resume !== 'string') {
        return sections;
    }

    // Look for common resume sections
    const sectionPatterns = [
        /(?:experience|work history|employment)[:\s]*([^]*?)(?=(?:education|skills|projects|summary|objective|$))/i,
        /(?:education|academic)[:\s]*([^]*?)(?=(?:experience|skills|projects|summary|objective|$))/i,
        /(?:skills|technical skills|competencies)[:\s]*([^]*?)(?=(?:experience|education|projects|summary|objective|$))/i,
        /(?:projects|portfolio)[:\s]*([^]*?)(?=(?:experience|education|skills|summary|objective|$))/i,
        /(?:summary|objective|profile)[:\s]*([^]*?)(?=(?:experience|education|skills|projects|$))/i
    ];
    
    sectionPatterns.forEach(pattern => {
        try {
            const match = resume.match(pattern);
            if (match && match[1].trim().length > 50) {
                sections.push(match[1].trim());
            }
        } catch (error) {
            console.error('Error matching resume pattern:', error);
        }
    });
    
    // If no sections found, split by paragraphs and take first few
    if (sections.length === 0) {
        try {
            const paragraphs = resume.split(/\n\s*\n/).filter(p => p.trim().length > 30);
            sections.push(...paragraphs.slice(0, 3));
        } catch (error) {
            console.error('Error splitting resume into paragraphs:', error);
        }
    }
    
    return sections;
}

/**
 * Compress job description by keeping essential requirements
 * @param {string} jobDescription - Original job description
 * @returns {string} Compressed job description
 */
function compressJobDescription(jobDescription) {
    if (!jobDescription) return '';
    
    // Remove extra whitespace
    let compressed = jobDescription.replace(/\s+/g, ' ').trim();
    
    // If too long, extract key parts
    if (compressed.length > 4000) {
        const keyParts = extractJobKeyParts(compressed);
        compressed = keyParts.join('\n\n');
    }
    
    // Final length check
    if (compressed.length > 3000) {
        compressed = compressed.substring(0, 3000) + '... [Content truncated for length]';
    }
    
    return compressed;
}

/**
 * Extract key parts from job description
 * @param {string} jobDescription - Job description text
 * @returns {Array<string>} Key parts
 */
function extractJobKeyParts(jobDescription) {
    const parts = [];
    
    // Add null/undefined check
    if (!jobDescription || typeof jobDescription !== 'string') {
        return parts;
    }
    
    // Look for key sections
    const keyPatterns = [
        /(?:requirements|qualifications|requirements)[:\s]*([^]*?)(?=(?:responsibilities|duties|benefits|$))/i,
        /(?:responsibilities|duties|role)[:\s]*([^]*?)(?=(?:requirements|qualifications|benefits|$))/i,
        /(?:about|company|overview)[:\s]*([^]*?)(?=(?:requirements|responsibilities|duties|$))/i
    ];
    
    keyPatterns.forEach(pattern => {
        try {
            const match = jobDescription.match(pattern);
            if (match && match[1] && match[1].trim().length > 30) {
                parts.push(match[1].trim());
            }
        } catch (error) {
            console.warn('Error matching job description pattern:', error);
        }
    });
    
    // If no key parts found, take first few paragraphs
    if (parts.length === 0) {
        try {
            const paragraphs = jobDescription.split(/\n\s*\n/).filter(p => p && p.trim().length > 20);
            parts.push(...paragraphs.slice(0, 2));
        } catch (error) {
            console.warn('Error splitting job description into paragraphs:', error);
        }
    }
    
    return parts;
}

/**
 * Compress custom instructions
 * @param {string} instructions - Custom instructions
 * @returns {string} Compressed instructions
 */
function compressInstructions(instructions) {
    if (!instructions) return '';
    
    let compressed = instructions.replace(/\s+/g, ' ').trim();
    
    if (compressed.length > 500) {
        compressed = compressed.substring(0, 500) + '...';
    }
    
    return compressed;
}

/**
 * Estimate token count for the input
 * @param {string} resume - Resume text
 * @param {string} jobDescription - Job description text
 * @param {string} instructions - Custom instructions
 * @returns {number} Estimated token count
 */
function estimateTokenCount(resume, jobDescription, instructions) {
    const totalChars = resume.length + jobDescription.length + instructions.length;
    return Math.ceil(totalChars * TOKENS_PER_CHAR);
}

/**
 * Analyze resume using chunking strategy for very long content
 * @param {string} resume - Resume text
 * @param {string} jobDescription - Job description text
 * @param {string} customInstructions - Custom instructions
 * @param {string} model - AI model
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeWithChunking(resume, jobDescription, customInstructions, model) {
    try {
        // Split resume into chunks
        const resumeChunks = splitIntoChunks(resume, 4000);
        const jobChunks = splitIntoChunks(jobDescription, 2000);
        
        // Analyze each chunk and combine results
        const results = [];
        
        for (let i = 0; i < Math.min(resumeChunks.length, 2); i++) {
            for (let j = 0; j < Math.min(jobChunks.length, 2); j++) {
                const result = await analyzeChunk(
                    resumeChunks[i], 
                    jobChunks[j], 
                    customInstructions, 
                    model
                );
                if (result.success) {
                    results.push(result.data);
                }
            }
        }
        
        // Combine results
        if (results.length > 0) {
            return {
                success: true,
                data: combineAnalysisResults(results)
            };
        } else {
            throw new Error('All chunk analyses failed');
        }
        
    } catch (error) {
        console.error('Chunking analysis failed:', error);
        return {
            success: false,
            error: 'Analysis failed due to content length. Please try with shorter content.',
            data: {
                score: 0,
                strengths: ['Analysis failed'],
                weaknesses: ['Content too long'],
                assessment: 'Please provide a shorter resume or job description.'
            }
        };
    }
}

/**
 * Split text into chunks
 * @param {string} text - Text to split
 * @param {number} maxLength - Maximum length per chunk
 * @returns {Array<string>} Text chunks
 */
function splitIntoChunks(text, maxLength) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += (currentChunk ? '. ' : '') + sentence;
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

/**
 * Analyze a single chunk
 * @param {string} resumeChunk - Resume chunk
 * @param {string} jobChunk - Job description chunk
 * @param {string} customInstructions - Custom instructions
 * @param {string} model - AI model
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeChunk(resumeChunk, jobChunk, customInstructions, model) {
    const apiKey = getApiKey();
    
    const systemPrompt = "You are a professional recruiter analyzing a resume section against a job description section. Provide brief, focused feedback.";
    
    const userPrompt = `Analyze this resume section against this job description section:

Resume: ${resumeChunk}

Job Description: ${jobChunk}

Provide a brief assessment with:
- Score (0-100)
- 2-3 key strengths
- 2-3 areas for improvement
- Brief overall assessment

Format as JSON: {"score": 75, "strengths": ["..."], "weaknesses": ["..."], "assessment": "..."}`;

    const response = await fetch(CONFIG.OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin || 'http://localhost:3000',
            'X-Title': 'Recrootly Resume Analysis'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        throw new Error(`Chunk analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices[0].message.content;

    try {
        const parsedResponse = JSON.parse(assistantResponse);
        return { success: true, data: parsedResponse };
    } catch (error) {
        return { success: false, error: 'Failed to parse chunk response' };
    }
}

/**
 * Combine multiple analysis results into one
 * @param {Array<Object>} results - Array of analysis results
 * @returns {Object} Combined result
 */
function combineAnalysisResults(results) {
    const scores = results.map(r => r.score).filter(s => typeof s === 'number');
    const allStrengths = results.flatMap(r => Array.isArray(r.strengths) ? r.strengths : []);
    const allWeaknesses = results.flatMap(r => Array.isArray(r.weaknesses) ? r.weaknesses : []);
    const allAssessments = results.map(r => r.assessment).filter(a => typeof a === 'string');
    
    // Calculate average score
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    // Get unique strengths and weaknesses
    const uniqueStrengths = [...new Set(allStrengths)].slice(0, 5);
    const uniqueWeaknesses = [...new Set(allWeaknesses)].slice(0, 5);
    
    // Combine assessments
    const combinedAssessment = allAssessments.length > 0 
        ? allAssessments.join(' ') 
        : 'Analysis completed using multiple sections.';
    
    return {
        score: avgScore,
        strengths: uniqueStrengths.length > 0 ? uniqueStrengths : ['Analysis completed'],
        weaknesses: uniqueWeaknesses.length > 0 ? uniqueWeaknesses : ['Areas for improvement identified'],
        assessment: combinedAssessment
    };
}

/**
 * Extract score from text response (fallback method)
 * @param {string} text - The response text
 * @returns {number} Extracted score or 0 if not found
 */
function extractScoreFromText(text) {
    const scoreMatch = text.match(/score[:\s]*(\d+)/i);
    return scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
}

/**
 * Extract strengths from text response (fallback method)
 * @param {string} text - The response text
 * @returns {Array<string>} Array of strengths
 */
function extractStrengthsFromText(text) {
    const strengthsMatch = text.match(/strengths?[:\s]*([^]*?)(?=weaknesses?|areas? for improvement|assessment|$)/i);
    if (strengthsMatch) {
        const strengthsText = strengthsMatch[1];
        // Extract bullet points or numbered items
        const items = strengthsText.match(/[-•*]\s*([^.\n]+)/g) || 
                     strengthsText.match(/\d+\.\s*([^.\n]+)/g) ||
                     strengthsText.split(',').map(s => s.trim()).filter(s => s.length > 0);
        return items ? items.map(item => item.replace(/^[-•*\d\.\s]+/, '').trim()) : ['Strong candidate'];
    }
    return ['Strong candidate'];
}

/**
 * Extract weaknesses from text response (fallback method)
 * @param {string} text - The response text
 * @returns {Array<string>} Array of weaknesses
 */
function extractWeaknessesFromText(text) {
    const weaknessesMatch = text.match(/weaknesses?|areas? for improvement[:\s]*([^]*?)(?=assessment|overall|$)/i);
    if (weaknessesMatch) {
        const weaknessesText = weaknessesMatch[1];
        // Extract bullet points or numbered items
        const items = weaknessesText.match(/[-•*]\s*([^.\n]+)/g) || 
                     weaknessesText.match(/\d+\.\s*([^.\n]+)/g) ||
                     weaknessesText.split(',').map(s => s.trim()).filter(s => s.length > 0);
        return items ? items.map(item => item.replace(/^[-•*\d\.\s]+/, '').trim()) : ['Areas for improvement identified'];
    }
    return ['Areas for improvement identified'];
}

/**
 * Extract assessment from text response (fallback method)
 * @param {string} text - The response text
 * @returns {string} Assessment text
 */
function extractAssessmentFromText(text) {
    const assessmentMatch = text.match(/assessment[:\s]*([^]*?)(?=\n\n|$)/i) ||
                           text.match(/overall[:\s]*([^]*?)(?=\n\n|$)/i);
    if (assessmentMatch) {
        return assessmentMatch[1].trim();
    }
    return 'Overall assessment provided by AI analysis.';
}

/**
 * Simple function to get resume feedback with default parameters
 * @param {string} resume - The resume text content
 * @param {string} jobDescription - The job description text
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeResume(resume, jobDescription) {
    return await getResumeFeedback(resume, jobDescription);
}

// Export for use in browser environment
if (typeof window !== 'undefined') {
    window.ResumeAnalysis = {
        getResumeFeedback,
        analyzeResume
    };
} 