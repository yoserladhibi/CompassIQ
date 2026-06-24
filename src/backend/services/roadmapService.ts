import { ProjectProfile } from "../../types";
import { retrieveTopK, getKnowledgeBase, KBItem } from "./retrievalService";

export interface RoadmapItem {
  id: string; // e.g. "roadmap_market_validation"
  title: string;
  dimension: string;
  rationale: string; // which gap/sub-score triggered this action
  linked_kb_ids: string[]; // resources grounding this action — must be non-empty
  horizon: "immediate" | "short_term" | "medium_term";
}

/**
 * Generates dynamic roadmap items by transforming diagnostic gaps and blockers
 * into chronological, fully grounded resource links.
 */
export function generateRoadmap(profile: ProjectProfile): RoadmapItem[] {
  const items: RoadmapItem[] = [];

  // Derive explicit gaps from scores if they arent present in the custom diagnosis array
  const gaps: { dimension: string; slug: string; description: string; suggested_action_title: string; severity?: string }[] = [];
  
  if (profile.diagnosis && (profile.diagnosis as any).gaps && Array.isArray((profile.diagnosis as any).gaps)) {
    gaps.push(...(profile.diagnosis as any).gaps);
  } else if (profile.scores) {
    // Derive gaps from poor scores
    for (const [dimension, sc] of Object.entries(profile.scores)) {
      if (dimension !== "overall" && sc && typeof sc === "object") {
        const catVal = sc as any;
        const sVal = catVal.score;
        if (sVal !== null && sVal < 80) {
          const desc = catVal.primary_gap?.fr || catVal.primary_gap?.ar || catVal.explanation || `Lacunes détectées dans la dimension ${dimension}.`;
          const actTitle = catVal.recommendation || `Recommandation pour la dimension ${dimension}`;
          
          gaps.push({
            dimension,
            slug: `${dimension}_score_gap`,
            description: desc,
            suggested_action_title: actTitle,
            severity: sVal < 40 ? "critical" : sVal < 70 ? "moderate" : "minor"
          });
        }
      }
    }
  }

  // Also process blockers - critical hurdles that need immediate resolution
  const blockers = (profile.diagnosis?.blockers_detected || []) as any[];
  for (const blocker of blockers) {
    const isAr = profile._meta?.language === "ar";
    const title = blocker.title?.fr || blocker.title?.ar || "Bloqueur détecté";
    gaps.push({
      dimension: blocker.dimension || "market",
      slug: blocker.id || `blocker_${Math.random().toString(36).substring(2, 7)}`,
      description: blocker.description?.fr || blocker.description?.ar || title,
      suggested_action_title: isAr ? `مواجهة وتجاوز: ${title}` : `Résoudre le goulot d'étranglement : ${title}`,
      severity: "critical"
    });
  }

  // Deduplicate and process into roadmap steps
  const processedDimensions = new Set<string>();

  for (const gap of gaps) {
    const searchString = `${gap.suggested_action_title} ${gap.description}`;
    const kbMatches = retrieveTopK(searchString, profile, 3);
    
    // Constraint Rule: A recommendation that cannot be traced to a specific item in the knowledge base is not acceptable
    if (kbMatches.length === 0) {
      continue; 
    }

    const linked_kb_ids = kbMatches.map(k => k.id);
    
    // Map horizon logically based on gap severity:
    // "horizon: derived from gap severity, sorted by horizon"
    let horizon: "immediate" | "short_term" | "medium_term" = "medium_term";
    if (gap.severity === "critical") {
      horizon = "immediate";
    } else if (gap.severity === "moderate") {
      horizon = "short_term";
    }

    items.push({
      id: `roadmap_${gap.dimension}_${gap.slug}`,
      title: gap.suggested_action_title,
      dimension: gap.dimension,
      rationale: gap.description,
      linked_kb_ids,
      horizon
    });
  }

  // Rule: Must be sorted by horizon (immediate -> short_term -> medium_term)
  const orderMap = { "immediate": 0, "short_term": 1, "medium_term": 2 };
  items.sort((a, b) => orderMap[a.horizon] - orderMap[b.horizon]);

  return items;
}

/**
 * Maps standard compliant RoadmapItem to expected legacy model RoadmapStep for UI safety.
 */
export function mapToFrontendSteps(items: RoadmapItem[]): any[] {
  const kb = getKnowledgeBase();

  return items.map((item, index) => {
    // Look up primary grounding resource details for this step
    const firstKbId = item.linked_kb_ids[0];
    const kbRes = kb.find(k => k.id === firstKbId) || kb[0];

    // Map time horizons to client expected states ('immediate' | 'short' | 'medium')
    const mappedHorizon = 
      item.horizon === "short_term" ? "short" : 
      item.horizon === "medium_term" ? "medium" : 
      "immediate";

    // Deduce gate identifiers based on custom resource alignments
    const gateMap: Record<string, string> = {
      "market": "G1",
      "commercial": "G2",
      "innovation": "G3",
      "scalability": "G4",
      "green": "G5"
    };
    const gateToken = gateMap[item.dimension.toLowerCase()] || "G1";

    const titleFr = typeof item.title === "object" && item.title !== null
      ? ((item.title as any).fr || (item.title as any).ar || "")
      : item.title;
    const titleAr = typeof item.title === "object" && item.title !== null
      ? ((item.title as any).ar || (item.title as any).fr || "")
      : item.title;

    const actionFr = typeof item.rationale === "object" && item.rationale !== null
      ? ((item.rationale as any).fr || (item.rationale as any).ar || "")
      : item.rationale;
    const actionAr = typeof item.rationale === "object" && item.rationale !== null
      ? ((item.rationale as any).ar || (item.rationale as any).fr || "")
      : item.rationale;

    return {
      id: `STEP_${String(index + 1).padStart(2, "0")}`,
      horizon: mappedHorizon,
      titleFr,
      titleAr,
      actionFr,
      actionAr,
      resourceFr: kbRes ? kbRes.name : "Ressource nationale d'orientation",
      resourceAr: kbRes ? (kbRes.description_ar ? kbRes.name : kbRes.name) : "مورد التوجيه الوطني",
      resourceId: firstKbId || "kb_generic",
      addressed_gate: gateToken,
      addressed_dimension: item.dimension
    };
  });
}
