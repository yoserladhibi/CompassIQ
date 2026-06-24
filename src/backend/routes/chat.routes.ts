import { Router } from "express";
import { chatWithAssistant } from "../controllers/chatController.js";

const router = Router();

router.post("/chat-assistant", chatWithAssistant);
router.post("/chat", chatWithAssistant);

export default router;
