import { ProjectProfile } from "../../types";
import { KBItem, retrieveTopK } from "./retrievalService";
import { callGroq } from "./groqClient";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

/**
 * Builds the system prompt restricting the assistant to grounded sources.
 */
export function buildSystemPrompt(profile: ProjectProfile, kbItems: KBItem[]): string {
  const activeLang = profile._meta?.language || "fr";
  const selectLanguageLabel = activeLang === "ar" ? "Arabic" : "French";

  const scoresSummary = profile.scores ? {
    market: profile.scores.market?.score ?? null,
    commercial: profile.scores.commercial?.score ?? null,
    innovation: profile.scores.innovation?.score ?? null,
    scalability: profile.scores.scalability?.score ?? null,
    green: profile.scores.green?.score ?? null,
    overall: profile.scores.overall?.score ?? null,
  } : {};

  // Construct a concise blockers representation
  const blockers = profile.blockers || (profile.diagnosis?.blockers_detected || []);
  const blockersText = blockers.map((b: any) => b.title?.fr || b.name || b.title?.ar || "").filter(Boolean).join("; ");

  let roadmapSummary: string[] = [];
  const rawChatRoadmap = (profile as any).roadmap;
  if (Array.isArray(rawChatRoadmap)) {
    roadmapSummary = rawChatRoadmap.map((i: any) => i.titleFr || i.title || "");
  } else if (rawChatRoadmap && typeof rawChatRoadmap === 'object' && Array.isArray((rawChatRoadmap as any).steps)) {
    roadmapSummary = (rawChatRoadmap as any).steps.map((i: any) => i.titleFr || i.title || "");
  }

  return `
You are the CompassIQ assistant, an orientation support tool for Tunisian entrepreneurs.

STRICT RULES — never break these:
1. Answer ONLY using the information in <project_profile> and <knowledge_base> below. Do not use any other knowledge about Tunisia, entrepreneurship programs, financing, or general facts.
2. Every concrete resource, program, or recommendation you mention must be one of the items listed in <knowledge_base>, referenced by its exact id in brackets, e.g. [kb_014].
3. If the user asks something not covered by <project_profile> or <knowledge_base>, say clearly that you don't have grounded information on that — do not improvise an answer.
4. Never invent a program name, organization, financing mechanism, or administrative step.
5. Always answer in the user's language: ${selectLanguageLabel} (be professional and encouraging).
6. Politely refuse queries completely unconnected to Tunisian entrepreneurship, business legislation, startup ecosystem, or their specific roadmap and scores.
7. Cite each distinct knowledge base resource AT MOST ONCE per response, on its first mention — never repeat the citation after every sentence about it.
8. Write in natural, conversational prose, the way a knowledgeable human advisor would answer in a chat — never output a bulleted field-by-field record (no "Description:", "Catégorie:", "Contact:" style labels) unless the user explicitly asks for a structured comparison of multiple options.
9. When mentioning a single resource, synthesize its relevant details into one or two natural, smooth sentences rather than listing every separate field from the knowledge base entry.
10. Reserve bullet points and headers for cases that genuinely need them — e.g. comparing 3+ distinct resources side by side.

<project_profile>
${JSON.stringify({
  stage: profile.diagnosis?.stage_assigned || "S1",
  scores: scoresSummary,
  blockers: blockersText,
  sector: profile.entrepreneur?.sector ?? "generic",
  region: profile.entrepreneur?.location ?? "Tunis",
  roadmap_summary: roadmapSummary,
}, null, 2)}
</project_profile>

<knowledge_base>
${JSON.stringify(kbItems.map(item => ({
  id: item.id,
  name: item.name,
  description_fr: item.description_fr,
  description_ar: item.description_ar,
  category: item.category,
  stages: item.eligible_stages,
  tags: item.tags,
  url: item.url,
  contact: item.contact
})), null, 2)}
</knowledge_base>
`.trim();
}

/**
 * Ensures all resource codes cited [kb_xxx] belong to the retrieved set.
 */
export function validateGrounding(response: string, retrievedIds: string[], lang: "fr" | "ar"): {
  text: string;
  citedSources: string[];
} {
  const matches = Array.from(response.matchAll(/\[(kb_\d+)\]/g));
  const citedIds = Array.from(new Set(matches.map(m => m[1])));
  const invalidIds = citedIds.filter(id => !retrievedIds.includes(id));

  if (invalidIds.length > 0) {
    if (lang === "ar") {
      return {
        text: "عذرًا، ليس لدي مرجع معتمد وآمن للرد على هذا الجزء من السؤال. أفضّل التركيز فقط على الخطوات المؤكدة في تشخيصك والمصادر الرسمية المتاحة في دليلنا.",
        citedSources: []
      };
    }
    return {
      text: "Désolé, je ne dispose pas d'une ressource vérifiée et certifiée pour répondre à cette partie de votre question. Je préfère m'en tenir uniquement aux éléments avérés de votre diagnostic et aux structures d'accompagnement référencées dans notre base.",
      citedSources: []
    };
  }

  return { text: response, citedSources: citedIds };
}

/**
 * High-level orchestration for executing grounded chat requests.
 */
export async function executeGroundedConversation(
  profile: ProjectProfile,
  message: string,
  history: ChatMessage[] = []
): Promise<{ text: string; citedSources: string[] }> {
  // 1. Retrieve most relevant KB resources for grounding (top 5 as per specs)
  const kbItems = retrieveTopK(message, profile, 5);
  const retrievedIds = kbItems.map(item => item.id);

  // 2. Format localized fallback if retrieving returns nothing or scope is completely off-topic
  const lang = (profile._meta?.language === "ar" ? "ar" : "fr") as "fr" | "ar";

  // 3. Compile the system prompt with grounding boundaries
  const systemPrompt = buildSystemPrompt(profile, kbItems);

  // 4. Request the grounded response from Groq
  try {
    const rawGroqResponse = await callGroq(systemPrompt, message, history);
    
    // 5. Run the grounding safety validator
    return validateGrounding(rawGroqResponse, retrievedIds, lang);
  } catch (err: any) {
    console.error("CompassIQ Grounded Chat Service Error:", err);
    
    // Return a soft error/offline message if Groq fails
    if (lang === "ar") {
      return {
        text: `أنا واجهت صعوبة في معالجة طلبك مؤقتًا. يرجى التركيز على التوصيات والمصادر الظاهرة في لوحة خارطة الطريق الخاصة بك.`,
        citedSources: []
      };
    }
    return {
      text: `Une difficulté technique m'empêche momentanément de générer une réponse. Veuillez vous référer aux recommandations et ressources déjà disponibles sur votre feuille de route.`,
      citedSources: []
    };
  }
}
