import { Request, Response } from "express";
import { loadProfile, saveProfile, loadDiskUserFile, saveDiskUserFile } from "../profileStore.js";
import { generateRoadmap, mapToFrontendSteps } from "../services/roadmapService.js";

/**
 * Endpoint controller to recreate / regenerate a grounded startup roadmap.
 */
export async function regenerateUserRoadmap(req: Request, res: Response) {
  try {
    const profile_id = req.body.profile_id || req.body.user_id;
    if (!profile_id) {
      return res.status(400).json({ error: "profile_id or user_id is required" });
    }

    // 1. Load the user project profile
    const profile = await loadProfile(profile_id);
    if (!profile) {
      return res.status(404).json({ error: `User profile ${profile_id} not found.` });
    }

    // 2. Generate roadmap items grounded in the knowledge base
    const roadmapItems = generateRoadmap(profile);
    
    // 3. Convert to frontend steps structure for integration compatibility
    const steps = mapToFrontendSteps(roadmapItems);

    // 4. Update the profile roadmap steps and write to disk
    const diskData = await loadDiskUserFile(profile_id);
    diskData.roadmap = diskData.roadmap || {};
    diskData.roadmap.steps = steps;
    
    await saveDiskUserFile(profile_id, diskData);

    return res.json({
      success: true,
      items: steps,
      isFallbackMode: false
    });
  } catch (err: any) {
    console.error("CompassIQ Roadmap Generator Endpoint Failure:", err);
    return res.status(500).json({ error: "Roadmap generation failed", details: err.message });
  }
}
