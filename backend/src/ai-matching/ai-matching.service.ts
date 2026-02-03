import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Tesseract from 'tesseract.js';

// Dynamic import for @xenova/transformers (ESM module)
let pipeline: any;
let env: any;

@Injectable()
export class AIMatchingService implements OnModuleInit {
  private readonly logger = new Logger(AIMatchingService.name);
  private embedder: any = null;
  private isModelLoading = false;
  private modelLoadPromise: Promise<void> | null = null;

  async onModuleInit() {
    // Preload the model on startup
    this.loadModel();
  }

  /**
   * Load the embedding model (all-MiniLM-L6-v2)
   */
  private async loadModel(): Promise<void> {
    if (this.embedder) return;
    if (this.isModelLoading && this.modelLoadPromise) {
      await this.modelLoadPromise;
      return;
    }

    this.isModelLoading = true;
    this.modelLoadPromise = (async () => {
      try {
        this.logger.log('Loading AI embedding model...');
        
        // Dynamic import for ESM module
        const transformers = await import('@xenova/transformers');
        pipeline = transformers.pipeline;
        env = transformers.env;
        
        // Disable local model check, use remote
        env.allowLocalModels = false;
        
        this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        this.logger.log('AI embedding model loaded successfully');
      } catch (error) {
        this.logger.error('Failed to load AI model:', error);
        throw error;
      } finally {
        this.isModelLoading = false;
      }
    })();

    await this.modelLoadPromise;
  }

  /**
   * Extract text from image using Tesseract OCR
   */
  async extractTextFromImage(imageUrl: string): Promise<string> {
    try {
      this.logger.log(`Extracting text from image: ${imageUrl}`);
      
      const result = await Tesseract.recognize(imageUrl, 'vie+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const extractedText = result.data.text.trim();
      this.logger.log(`Extracted ${extractedText.length} characters from image`);
      
      return extractedText;
    } catch (error) {
      this.logger.error(`OCR failed for ${imageUrl}:`, error);
      return '';
    }
  }

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    await this.loadModel();
    
    if (!text || text.trim().length === 0) {
      return [];
    }

    try {
      // Truncate text to avoid token limit (max ~512 tokens)
      const truncatedText = text.slice(0, 5000);
      
      const output = await this.embedder(truncatedText, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert to array
      return Array.from(output.data);
    } catch (error) {
      this.logger.error('Embedding generation failed:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Create JD text for embedding
   */
  createJDText(job: {
    name: string;
    description?: string;
    skills?: string[];
    level?: string;
  }): string {
    const parts = [
      `Job Title: ${job.name}`,
      job.description ? `Description: ${job.description}` : '',
      job.skills?.length ? `Required Skills: ${job.skills.join(', ')}` : '',
      job.level ? `Level: ${job.level}` : '',
    ];

    return parts.filter(Boolean).join('\n');
  }

  /**
   * Extract skills from CV text using keyword matching
   */
  extractSkillsFromText(text: string, jobSkills: string[]): {
    matchedSkills: string[];
    missingSkills: string[];
  } {
    const textLower = text.toLowerCase();
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of jobSkills) {
      const skillLower = skill.toLowerCase();
      // Check for exact match or partial match
      const variations = [
        skillLower,
        skillLower.replace(/\./g, ''),
        skillLower.replace(/js$/, 'javascript'),
        skillLower.replace(/javascript$/, 'js'),
      ];

      const found = variations.some((v) => textLower.includes(v));
      if (found) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    return { matchedSkills, missingSkills };
  }

  /**
   * Generate short explanation for match
   */
  generateExplanation(
    matchScore: number,
    matchedSkills: string[],
    missingSkills: string[],
  ): string {
    const scorePercent = Math.round(matchScore * 100);
    
    if (matchScore >= 0.8) {
      return `Ứng viên rất phù hợp (${scorePercent}%). ${matchedSkills.length > 0 ? `Có ${matchedSkills.slice(0, 3).join(', ')}` : ''}.`;
    } else if (matchScore >= 0.6) {
      return `Ứng viên phù hợp khá tốt (${scorePercent}%). ${matchedSkills.length > 0 ? `Có ${matchedSkills.slice(0, 2).join(', ')}` : ''}${missingSkills.length > 0 ? `. Cần bổ sung: ${missingSkills.slice(0, 2).join(', ')}` : ''}.`;
    } else if (matchScore >= 0.4) {
      return `Ứng viên phù hợp một phần (${scorePercent}%). ${missingSkills.length > 0 ? `Thiếu: ${missingSkills.slice(0, 3).join(', ')}` : ''}.`;
    } else {
      return `Mức độ phù hợp thấp (${scorePercent}%). Hồ sơ không khớp nhiều với yêu cầu công việc.`;
    }
  }

  /**
   * Calculate match score with improved algorithm
   * Prioritizes skill matching and boosts score when skills are found
   */
  private calculateMatchScore(
    semanticScore: number,
    matchedSkills: string[],
    jobSkills: string[],
  ): number {
    // If no skills required, use semantic score only
    if (jobSkills.length === 0) {
      // Boost semantic score to be more realistic (0.3-0.6 -> 0.5-0.9)
      return Math.min(0.95, semanticScore * 1.5 + 0.3);
    }

    // Calculate skill match ratio
    const skillMatchRatio = matchedSkills.length / jobSkills.length;

    // New formula: 40% semantic + 60% skills (skills are more important)
    // Also apply a boost to make scores more realistic
    let baseScore = semanticScore * 0.4 + skillMatchRatio * 0.6;

    // Apply bonus for having most skills matched
    if (skillMatchRatio >= 0.8) {
      // 80%+ skills matched: bonus +20%
      baseScore = Math.min(0.98, baseScore + 0.2);
    } else if (skillMatchRatio >= 0.6) {
      // 60%+ skills matched: bonus +15%
      baseScore = Math.min(0.95, baseScore + 0.15);
    } else if (skillMatchRatio >= 0.4) {
      // 40%+ skills matched: bonus +10%
      baseScore = Math.min(0.9, baseScore + 0.1);
    }

    // Apply semantic boost if CV content is relevant
    if (semanticScore > 0.5) {
      baseScore = Math.min(0.98, baseScore + 0.05);
    }

    // Minimum score of 0.1 if at least some content was extracted
    return Math.max(0.1, Math.min(0.98, baseScore));
  }

  /**
   * Match a single CV against JD
   */
  async matchCVWithJD(
    cvUrl: string,
    jdText: string,
    jdEmbedding: number[],
    jobSkills: string[],
  ): Promise<{
    cvText: string;
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    explanation: string;
  }> {
    // 1. Extract text from CV image
    const cvText = await this.extractTextFromImage(cvUrl);
    
    if (!cvText || cvText.length < 50) {
      return {
        cvText: '',
        matchScore: 0,
        matchedSkills: [],
        missingSkills: jobSkills,
        explanation: 'Không thể trích xuất nội dung từ CV',
      };
    }

    // 2. Generate CV embedding
    const cvEmbedding = await this.generateEmbedding(cvText);
    
    if (cvEmbedding.length === 0) {
      return {
        cvText,
        matchScore: 0,
        matchedSkills: [],
        missingSkills: jobSkills,
        explanation: 'Không thể phân tích CV',
      };
    }

    // 3. Calculate semantic similarity
    const semanticScore = this.cosineSimilarity(jdEmbedding, cvEmbedding);

    // 4. Extract skills match
    const { matchedSkills, missingSkills } = this.extractSkillsFromText(cvText, jobSkills);

    // 5. Calculate final score with improved algorithm
    const matchScore = this.calculateMatchScore(semanticScore, matchedSkills, jobSkills);

    // 6. Generate explanation
    const explanation = this.generateExplanation(matchScore, matchedSkills, missingSkills);

    this.logger.log(`CV Match: semantic=${semanticScore.toFixed(3)}, skills=${matchedSkills.length}/${jobSkills.length}, final=${matchScore.toFixed(3)}`);

    return {
      cvText,
      matchScore: Math.round(matchScore * 100) / 100,
      matchedSkills,
      missingSkills,
      explanation,
    };
  }
}
