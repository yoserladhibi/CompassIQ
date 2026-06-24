import { Request, Response } from "express";
import { loadProfile, saveProfile, loadDiskUserFile, saveDiskUserFile } from "../profileStore.js";
import { executeGroundedConversation, ChatMessage } from "../services/chatService.js";

export async function chatWithAssistant(req: Request, res: Response) {
  try {
    const { message } = req.body;
    const profile_id = req.body.profile_id || req.body.user_id;
    if (!profile_id || !message) {
      return res.status(400).json({ error: "profile_id or user_id and message are required" });
    }

    // 1. Load the user's project profile
    let profile;
    try {
      profile = await loadProfile(profile_id);
    } catch (err) {
      return res.status(404).json({ error: `User profile ${profile_id} could not be loaded.` });
    }

    // 2. Load disk data to fetch chat history
    const diskData = await loadDiskUserFile(profile_id);
    diskData.chat_history = diskData.chat_history || [];

    // Map history to ChatMessage interface format
    const history: ChatMessage[] = diskData.chat_history.map((h: any) => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.content
    }));

    // 3. Append current user message onto chat history securely on disk
    diskData.chat_history.push({
      role: "user",
      content: message,
      timestamp: new Date().toISOString()
    });

    // 4. Run the grounded conversation with Groq validation
    const { text, citedSources } = await executeGroundedConversation(profile, message, history);

    // 5. Append assistant reply onto disk chat history
    diskData.chat_history.push({
      role: "assistant",
      content: text,
      timestamp: new Date().toISOString()
    });

    // Cap history size to last 24 items to balance index size
    if (diskData.chat_history.length > 24) {
      diskData.chat_history = diskData.chat_history.slice(-24);
    }

    await saveDiskUserFile(profile_id, diskData);

    return res.json({
      success: true,
      reply: text,
      citedSources,
      isFallbackMode: false // Grounded Groq acts as primary without relying on fallback flags
    });
  } catch (err: any) {
    console.error("CompassIQ Assistant Controller Failure:", err);
    return res.status(500).json({ error: "Assistant analysis failed", details: err.message });
  }
}
