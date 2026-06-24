import { Router } from "express";
import { regenerateUserRoadmap } from "../controllers/roadmapController.js";

const router = Router();

router.post("/roadmap/generate", regenerateUserRoadmap);
router.post("/roadmap/regenerate", regenerateUserRoadmap);

export default router;
