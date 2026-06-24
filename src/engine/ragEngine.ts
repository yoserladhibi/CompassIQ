/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { ProjectProfile } from '../types.js';
import { KBItem, getKnowledgeBase, retrieveTopK } from '../backend/services/retrievalService.js';
import { generateRoadmap, mapToFrontendSteps } from '../backend/services/roadmapService.js';

export interface KbResource {
  id: string;
  name: string;
  category: string;
  type: string;
  description_fr: string;
  description_ar: string;
  eligible_stages: string[];
  eligible_sectors: string[];
  geographic_scope: string;
  url: string | null;
  contact: string;
  language: string[];
  tags: string[];
}

export interface RoadmapStep {
  id: string;
  horizon: 'immediate' | 'short' | 'medium';
  titleFr: string;
  titleAr: string;
  actionFr: string;
  actionAr: string;
  resourceFr: string;
  resourceAr: string;
  resourceId: string;
  addressed_gate?: string;
  addressed_dimension?: string;
}

/**
 * Maps a Knowledge Base resource to its corresponding gating rule and dimension.
 */
export function getGateForResource(res: KbResource): { gate: string; dimension: string } {
  if (res.id === 'kb_001') return { gate: 'G1', dimension: 'market' }; // APII
  if (res.id === 'kb_003') return { gate: 'G3', dimension: 'innovation' }; // Startup Act
  if (res.id === 'kb_013') return { gate: 'G4', dimension: 'scalability' }; // RNE
  if (res.id === 'kb_011') return { gate: 'G5', dimension: 'green' }; // CITET
  if (res.id === 'kb_005' || res.id === 'kb_006' || res.id === 'kb_007') return { gate: 'G2', dimension: 'commercial' }; // BTS, BFPME
  
  const tagsStr = (res.tags || []).map(t => t.toLowerCase()).join(' ');
  const cat = (res.category || '').toLowerCase();
  
  if (tagsStr.includes('vert') || tagsStr.includes('environnement') || tagsStr.includes('impact') || cat === 'environment' || cat === 'standards') {
    return { gate: 'G5', dimension: 'green' };
  }
  if (cat === 'financing' || tagsStr.includes('financement') || tagsStr.includes('crédit') || tagsStr.includes('banque')) {
    return { gate: 'G2', dimension: 'commercial' };
  }
  if (tagsStr.includes('technologie') || tagsStr.includes('innovation') || tagsStr.includes('brevet') || cat === 'innovation') {
    return { gate: 'G3', dimension: 'innovation' };
  }
  if (tagsStr.includes('croissance') || tagsStr.includes('expansion') || tagsStr.includes('export') || cat === 'scalability') {
    return { gate: 'G4', dimension: 'scalability' };
  }
  
  return { gate: 'G1', dimension: 'market' };
}

/**
 * RagEngine shim layer redesigned to route all dynamic expert retrieval
 * and bilingual synthesis through Groq API securely.
 */
export class RagEngine {
  private resources: KbResource[] = [];

  constructor() {
    this.loadKb();
  }

  public checkAndTrackQuotaError(err: any): void {
    // Left as a harmless no-op for backward compatibility.
    // Since Groq acts as primary without relying on high-latency fallback flags,
    // we bypass Gemini quota error logic entirely.
  }

  public shouldBypassGemini(): boolean {
    // True because we are strictly bypassing Gemini and using Groq as LLM provider.
    return true;
  }

  public getResources(): KbResource[] {
    return this.resources;
  }

  /**
   * Loads the latest curated knowledge base v2
   */
  private loadKb() {
    try {
      const kbPath = path.join(process.cwd(), 'src', 'data', 'CompassIQ_knowledge_base_v2.json');
      if (fs.existsSync(kbPath)) {
        const fileContent = fs.readFileSync(kbPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.resources = parsed.resources || [];
        console.log(`Success: Registered ${this.resources.length} resources in RagEngine compatibility wrapper.`);
      } else {
        console.error(`KB JSON not found at ${kbPath}`);
      }
    } catch (err: any) {
      console.error('Error loading KB JSON:', err);
    }
  }

  /**
   * Adds new resource to KB and saves it back to the file
   */
  public addResource(resource: KbResource): boolean {
    try {
      this.resources.push(resource);
      const kbPath = path.join(process.cwd(), 'src', 'data', 'CompassIQ_knowledge_base_v2.json');
      const fileContent = fs.readFileSync(kbPath, 'utf-8');
      const parsed = JSON.parse(fileContent);
      parsed.resources = this.resources;
      parsed.total_resources = this.resources.length;
      
      fs.writeFileSync(kbPath, JSON.stringify(parsed, null, 2), 'utf-8');
      console.log(`Resource ${resource.id} appended to local KB file.`);
      return true;
    } catch (err: any) {
      console.error('Failed to append to KB file:', err);
      return false;
    }
  }

  /**
   * Locally computes word frequencies cosine similarity (Offline Ranker Fallback)
   */
  public computeCosineSimilarity(query: string, doc: string): number {
    const cleanAndTokenize = (text: string) => {
      return text.toLowerCase()
        .replace(/[^\w\s\u0600-\u06FF]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2);
    };

    const qWords = cleanAndTokenize(query);
    const dWords = cleanAndTokenize(doc);

    const vocab = Array.from(new Set([...qWords, ...dWords]));
    if (vocab.length === 0) return 0;

    const qVec = vocab.map(w => qWords.filter(qw => qw === w).length);
    const dVec = vocab.map(w => dWords.filter(dw => dw === w).length);

    let dotProduct = 0;
    let qNorm = 0;
    let dNorm = 0;

    for (let i = 0; i < vocab.length; i++) {
      dotProduct += qVec[i] * dVec[i];
      qNorm += qVec[i] * qVec[i];
      dNorm += dVec[i] * dVec[i];
    }

    if (qNorm === 0 || dNorm === 0) return 0;
    return dotProduct / (Math.sqrt(qNorm) * Math.sqrt(dNorm));
  }

  /**
   * Step 1 & 2: Dynamic query construction, hard filtering, and semantic ranking.
   */
  public retrieveCandidates(profile: ProjectProfile, limit = 8): KbResource[] {
    const sector = profile.entrepreneur.sector || 'all';
    const stage = profile.diagnosis.stage_assigned || 'S1';
    
    // Convert S1-S6 to taxonomy stage slugs
    const stageMap: Record<string, string> = {
      'S1': 'ideation',
      'S2': 'market_validation',
      'S3': 'structuration',
      'S4': 'fundraising',
      'S5': 'launch_planning',
      'S6': 'growth'
    };
    const targetStageSlug = stageMap[stage] || 'ideation';

    // 1. Hard Filtering (Stage eligibility & Sector eligibility)
    const candidates = this.resources.filter(res => {
      const stageMatch = res.eligible_stages.includes(targetStageSlug);
      const sectorMatch = res.eligible_sectors.includes(sector) || res.eligible_sectors.includes('all');
      return stageMatch && sectorMatch;
    });

    let finalCandidates = candidates;
    if (finalCandidates.length < 4) {
      finalCandidates = this.resources.filter(res => res.eligible_stages.includes(targetStageSlug));
    }
    if (finalCandidates.length === 0) {
      finalCandidates = this.resources.slice(0, 8);
    }

    // 2. Build Ranker query from User Profile Context
    const activeLang = profile._meta.language || 'fr';
    const blockersText = (profile.diagnosis.blockers_detected || [])
      .map(b => (activeLang === 'ar' ? (b.title?.ar || '') : (b.title?.fr || '')))
      .join(' ');
    
    const primaryGaps: string[] = [];
    if (profile.scores) {
      Object.entries(profile.scores).forEach(([_, catScore]: [string, any]) => {
        if (catScore && catScore.primary_gap) {
          const gapText = activeLang === 'ar' ? catScore.primary_gap.ar : catScore.primary_gap.fr;
          if (gapText) primaryGaps.push(gapText);
        }
      });
    }

    const queryText = `Secteur: ${sector}. Etape: ${targetStageSlug}. Écarts: ${primaryGaps.join(', ')}. Bloqueurs: ${blockersText}`;

    // Define gating bias table boost categories
    const GATING_BIAS: Record<string, string[]> = {
      "G1": ["accompaniment", "ecosystem"],
      "G2": ["accompaniment", "financing"],
      "G3": ["accompaniment", "ecosystem"],
      "G4": ["accompaniment", "administrative"],
      "G5": ["standards", "financing"],
    };

    const boostedCategories = new Set<string>();
    if (profile.scores) {
      if (profile.scores.market?.gating_applied) {
        GATING_BIAS["G1"].forEach(cat => boostedCategories.add(cat));
      }
      if (profile.scores.commercial?.gating_applied) {
        GATING_BIAS["G2"].forEach(cat => boostedCategories.add(cat));
      }
      if (profile.scores.innovation?.gating_applied) {
        GATING_BIAS["G3"].forEach(cat => boostedCategories.add(cat));
      }
      if (profile.scores.scalability?.gating_applied) {
        GATING_BIAS["G4"].forEach(cat => boostedCategories.add(cat));
      }
      if (profile.scores.green?.gating_applied) {
        GATING_BIAS["G5"].forEach(cat => boostedCategories.add(cat));
      }
    }

    // 3. Compute semantic similarity grades containing category biases
    const scoredCandidates = finalCandidates.map(res => {
      const contentToMatch = `${res.name} ${res.description_fr} ${res.description_ar} ${res.tags.join(' ')}`;
      let score = this.computeCosineSimilarity(queryText, contentToMatch);
      
      const resCategory = (res.category || '').toLowerCase();
      if (boostedCategories.has(resCategory)) {
        score += 0.15;
      }

      return { res, score };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates.slice(0, limit).map(item => item.res);
  }

  /**
   * Step 3: LLM Synthesis with Groq (bypassing Google Gemini completely)
   */
  public async generateRoadmap(profile: ProjectProfile): Promise<{ success: boolean; items: RoadmapStep[]; error?: string }> {
    try {
      // 1. Generate roadmap items via the new grounded service
      const roadmapItems = generateRoadmap(profile);
      
      // 2. Convert standard items into UI compatible step schema
      const steps = mapToFrontendSteps(roadmapItems);

      return {
        success: true,
        items: steps
      };
    } catch (err: any) {
      console.error("CompassIQ RagEngine generateRoadmap failure:", err);
      return {
        success: false,
        items: [],
        error: err.message
      };
    }
  }

  /**
   * Returns groundedness statistics based on local references
   */
  public async getGroundingStats(profile: ProjectProfile, items: RoadmapStep[]): Promise<{ groundednessRate: number }> {
    if (items.length === 0) return { groundednessRate: 100 };
    
    const validIds = new Set(this.resources.map(r => r.id));
    let groundedCount = 0;
    
    items.forEach(step => {
      if (step.resourceId && validIds.has(step.resourceId)) {
        groundedCount++;
      }
    });

    return {
      groundednessRate: parseFloat(((groundedCount / items.length) * 100).toFixed(1))
    };
  }
}
