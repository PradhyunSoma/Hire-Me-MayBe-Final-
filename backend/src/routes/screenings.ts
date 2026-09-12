import { Router } from "express";
import multer from "multer";
import { screeningsController } from "../controllers/screeningsController";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

router.post("/", screeningsController.create);

router.get("/", screeningsController.list);

router.post(
  "/:id/job-description",
  upload.single("file"),
  screeningsController.uploadJobDescription
);

router.post(
  "/:id/resumes",
  upload.single("file"),
  screeningsController.uploadResume
);

router.post("/:id/run", screeningsController.run);

router.get("/:id/status", screeningsController.status);

router.get("/:id/results", screeningsController.results);

router.get("/:id/candidates/:cid", screeningsController.getCandidate);

router.post("/:id/compare", screeningsController.compare);

router.post("/:id/counterfactual", screeningsController.counterfactual);

router.get("/:id/bias", screeningsController.bias);

router.post("/:id/chat", screeningsController.chat);

export default router;
