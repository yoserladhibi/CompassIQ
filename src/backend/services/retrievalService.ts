import fs from "fs";
import path from "path";
import { ProjectProfile } from "../../types";

export interface KBItem {
  id: string;
  name: string;
  title_fr?: string;
  title_ar?: string;
  description_fr: string;
  description_ar: string;
  category: string;
  eligible_stages: string[];
  eligible_sectors: string[];
  tags: string[];
  geographic_scope: string;
  url: string | null;
  contact: string;
  language: string[];
  // Backwards compatibility mappings
  stage_slugs?: string[];
  dimension_tags?: string[];
}

let loadedKnowledgeBase: KBItem[] = [];

/**
 * Loads the Knowledge Base JSON file from disk into memory.
 */
export function getKnowledgeBase(): KBItem[] {
  if (loadedKnowledgeBase.length === 0) {
    try {
      const kbPath = path.join(process.cwd(), "src", "data", "CompassIQ_knowledge_base_v2.json");
      if (fs.existsSync(kbPath)) {
        const content = fs.readFileSync(kbPath, "utf-8");
        const parsed = JSON.parse(content);
        // Map the fields for maximum resilience
        loadedKnowledgeBase = (parsed.resources || []).map((res: any) => ({
          ...res,
          title_fr: res.name,
          title_ar: res.name,
          stage_slugs: res.eligible_stages || [],
          dimension_tags: res.tags || res.categories || []
        }));
        console.log(`CompassIQ: Loaded ${loadedKnowledgeBase.length} items to in-memory score search index.`);
      } else {
        console.warn(`CompassIQ Retrieval: Knowledge base not found at: ${kbPath}`);
      }
    } catch (err: any) {
      console.error(`CompassIQ Retrieval: Failed to load knowledge base:`, err);
    }
  }
  return loadedKnowledgeBase;
}

/**
 * Utility to calculate keyword overlap between a query and a text block.
 */
export function keywordOverlap(query: string, text: string): number {
  if (!query || !text) return 0;
  
  const tokenise = (str: string) => 
    str.toLowerCase()
       .replace(/[^\w\s\u0600-\u06FF]/g, "")
       .split(/\s+/)
       .filter(w => w.length > 2);

  const queryTerms = tokenise(query);
  const textTerms = new Set(tokenise(text));
  
  if (queryTerms.length === 0) return 0;
  
  let overlap = 0;
  for (const term of queryTerms) {
    if (textTerms.has(term)) {
      overlap += 1;
    }
  }
  return overlap;
}

/**
 * Scorer mapping function following exact specifications in prompt Section 3.
 */
export function scoreItem(item: KBItem, query: string, profile: ProjectProfile): number {
  let score = 0;

  // 1. Stage mapping setup & match
  const stageMap: Record<string, string> = {
    "S1": "ideation",
    "S2": "market_validation",
    "S3": "structuration",
    "S4": "fundraising",
    "S5": "launch_planning",
    "S6": "growth"
  };
  
  const userStageCode = profile.diagnosis?.stage_assigned || profile.entrepreneur?.stage_self_assessed || "S1";
  const userStageSlug = stageMap[userStageCode] || userStageCode || "ideation";
  const stageSlugs = item.stage_slugs || item.eligible_stages || [];

  if (stageSlugs.includes(userStageSlug)) {
    score += 3;
  }

  // 2. Gaps & Dimension tag match
  // Derive gaps array from diagnostic structures or subscores
  const gaps: { dimension: string; description: string }[] = [];
  if (profile.diagnosis && (profile.diagnosis as any).gaps && Array.isArray((profile.diagnosis as any).gaps)) {
    gaps.push(...(profile.diagnosis as any).gaps);
  } else {
    // Derive from scoring gaps
    if (profile.scores) {
      for (const [dimension, sc] of Object.entries(profile.scores)) {
        if (dimension !== "overall" && sc && typeof sc === "object") {
          const catVal = sc as any;
          if (catVal.score !== null && catVal.score < 80) {
            const desc = catVal.primary_gap?.fr || catVal.primary_gap?.ar || catVal.explanation || "";
            gaps.push({ dimension, description: desc });
          }
        }
      }
    }
  }

  const dimensionTags = item.dimension_tags || item.tags || [];
  for (const gap of gaps) {
    if (dimensionTags.some(t => t.toLowerCase().includes(gap.dimension.toLowerCase()))) {
      score += 2;
    }
  }

  // 3. Match against the user's specific sector
  const userSector = profile.entrepreneur?.sector || "all";
  const eligibleSectors = item.eligible_sectors || [];
  if (eligibleSectors.includes("all") || eligibleSectors.includes(userSector.toLowerCase())) {
    score += 1.5;
  }

  // 4. Keyword matches of the query against bilingual fields
  const searchableText = `${item.name} ${item.description_fr || ""} ${item.description_ar || ""} ${(item.tags || []).join(" ")}`;
  score += keywordOverlap(query, searchableText);

  return score;
}

/**
 * Retrieves the top K scored and relevant KBItems based on query and entrepreneur project profile.
 */
export function retrieveTopK(query: string, profile: ProjectProfile, k = 5): KBItem[] {
  const kb = getKnowledgeBase();
  if (kb.length === 0) return [];

  const scored = kb.map(item => ({
    item,
    score: scoreItem(item, query, profile)
  }));

  // Force minimum threshold score or return only positive scored entries
  return scored
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(entry => entry.item);
}
