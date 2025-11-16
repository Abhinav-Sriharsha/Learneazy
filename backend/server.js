import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { agent, flashcardChain } from "./ragChain.js";
import { ensureVectorStoreIsReady, processPdfUpload } from "./ingestion.js";
import { PORT } from "./config.js";
import { AIMessage } from "@langchain/core/messages";
import { checkQuota, checkPdfQuota } from "./middleware/quota.js";

// Initialize the Express app
const app = express();

// Middleware
// Enable CORS for frontend domains
const corsOptions = {
  origin: [
    'http://localhost:3000',  // Local development
    'https://abhinavsriharsha.tech',  // Production frontend
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions)); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Enable application/json request bodies

// Setup multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Use timestamp to avoid name collisions
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

/**
 * ==================================================================
 * HELPER FUNCTION
 * (This correctly parses the agent's response)
 * ==================================================================
 */
const parseAgentOutput = (agentState) => {
  const lastMessage = agentState.messages[agentState.messages.length - 1];

  if (!lastMessage) {
    console.error("Agent state has no messages.");
    return "I'm sorry, I seem to be having trouble. Please try again.";
  }

  // 1. Handle string content (simple case)
  if (typeof lastMessage.content === "string") {
    return lastMessage.content;
  }

  // 2. Handle array content (Gemini-style)
  if (Array.isArray(lastMessage.content)) {
    return lastMessage.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  }
  
  // 3. Fallback
  console.error("Agent did not produce a valid text response:", lastMessage);
  console.dir(lastMessage, { depth: null });
  return "I'm sorry, I seem to be having trouble. Please try again.";
};

/**
 * ==================================================================
 * THE MAIN CHAT ENDPOINT
 * (Now with quota checking)
 * ==================================================================
 */
app.post("/chat", checkQuota, async (req, res) => {
  try {
    const { question, history } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }
    
    const chat_history = history || [];

    console.log(`\n--- New Request ---`);
    console.log(`Question: ${question}`);
    console.log(`Chat history length: ${chat_history.length}`);

    // Manually format the input for the agent
    const messages = chat_history.map((msg) => ({
      role: msg.role === "human" ? "user" : "assistant",
      content: msg.content,
    }));
    messages.push({ role: "user", content: question });

    // Call agent.invoke() directly
    const agentState = await agent.invoke({
      messages: messages,
      // No context/pdfId needed for local version
    });

    // Manually parse the output
    const answer = parseAgentOutput(agentState);

    console.log(`Answer: ${answer.substring(0, 70)}...`);

    // Send the answer back to the front-end
    res.json({ answer: answer });
    
  } catch (err) {
    console.error("\n--- AN ERROR OCCURRED IN /chat ---");
    console.error(err);
    res.status(500).json({
      error: "An error occurred while processing your request.",
      details: err.message,
    });
  }
});

/**
 * ==================================================================
 * FLASHCARD ENDPOINT
 * (Now with quota checking)
 * ==================================================================
 */
app.post("/generate_flashcards", checkQuota, async (req, res) => {
  try {
    const { chapter, count } = req.body;
    if (!chapter || !count) {
      return res.status(400).json({ error: "Chapter and count are required." });
    }

    console.log(`\n--- New Flashcard Request ---`);
    console.log(`Chapter: ${chapter}, Count: ${count}`);

    const result = await flashcardChain.invoke({
      chapter: String(chapter),
      count: Number(count),
      // No pdfId needed
    });

    console.log(`✅ Successfully generated ${result.cards.length} flashcards.`);
    res.json(result);

  } catch (err) {
    console.error("\n--- AN ERROR OCCURRED IN /generate_flashcards ---");
    console.error(err);
    res.status(500).json({
      error: "An error occurred while generating flashcards.",
      details: err.message,
    });
  }
});

/**
 * ==================================================================
 * CHECK PDF QUOTA ENDPOINT
 * (Check quota BEFORE upload to avoid wasting time processing)
 * ==================================================================
 */
app.get("/check_pdf_quota", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const userGoogleKey = req.headers["x-user-google-key"];
    const userCohereKey = req.headers["x-user-cohere-key"];

    // If user is not authenticated, reject
    if (!userId) {
      return res.status(401).json({
        canUpload: false,
        error: "Authentication required",
      });
    }

    // If user has their own API keys, they have unlimited uploads
    if (userGoogleKey && userCohereKey) {
      return res.json({
        canUpload: true,
        unlimited: true,
      });
    }

    // For free tier users, check their PDF upload count
    const { supabaseClient } = await import("./config.js");
    const { data: user, error } = await supabaseClient
      .from("users")
      .select("pdfs_uploaded, max_pdfs")
      .eq("google_id", userId)
      .single();

    if (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({
        canUpload: false,
        error: "Failed to check quota",
      });
    }

    const maxPdfs = user.max_pdfs || 1; // Default to 1 if not set
    const canUpload = user.pdfs_uploaded < maxPdfs;

    res.json({
      canUpload,
      unlimited: false,
      pdfsUsed: user.pdfs_uploaded,
      maxPdfs,
    });
  } catch (err) {
    console.error("Error in /check_pdf_quota:", err);
    res.status(500).json({
      canUpload: false,
      error: "Failed to check quota",
    });
  }
});

/**
 * ==================================================================
 * PDF UPLOAD ENDPOINT
 * (Now with PDF quota checking)
 * ==================================================================
 */
app.post("/upload_pdf", checkPdfQuota, upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    console.log(`\n--- New PDF Upload ---`);
    console.log(`File: ${req.file.originalname}`);
    console.log(`Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Saved to: ${req.file.path}`);

    // Process the uploaded PDF
    const result = await processPdfUpload(req.file.path, req.file.originalname);

    res.json({
      success: true,
      message: "PDF uploaded and processed successfully",
      filename: req.file.originalname,
      chunks: result.totalChunks,
      chapters: result.chapters,
    });
  } catch (err) {
    console.error("\n--- AN ERROR OCCURRED IN /upload_pdf ---");
    console.error(err);

    // Clean up the uploaded file if processing failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "An error occurred while processing the PDF.",
      details: err.message,
    });
  }
});

/**
 * ==================================================================
 * ADMIN ENDPOINTS
 * ==================================================================
 */

// Admin email - only this user can access admin endpoints
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "your-admin-email@gmail.com";

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  const userId = req.headers["x-user-id"];
  const userEmail = req.headers["x-user-email"];

  if (!userId || userEmail !== ADMIN_EMAIL) {
    return res.status(403).json({
      error: "Unauthorized",
      message: "Admin access required",
    });
  }

  next();
}

// Get all users (admin only)
app.get("/admin/users", isAdmin, async (req, res) => {
  try {
    const { supabaseClient } = await import("./config.js");
    const { data: users, error } = await supabaseClient
      .from("users")
      .select("id, google_id, email, name, photo_url, queries_used, pdfs_uploaded, max_queries, max_pdfs, has_own_keys, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({
        error: "Failed to fetch users",
        details: error.message,
      });
    }

    res.json({ users });
  } catch (err) {
    console.error("Error in /admin/users:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

// Update user quotas (admin only)
app.patch("/admin/users/:userId", isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { max_queries, max_pdfs, queries_used, pdfs_uploaded } = req.body;

    const updates = {};
    if (max_queries !== undefined) updates.max_queries = max_queries;
    if (max_pdfs !== undefined) updates.max_pdfs = max_pdfs;
    if (queries_used !== undefined) updates.queries_used = queries_used;
    if (pdfs_uploaded !== undefined) updates.pdfs_uploaded = pdfs_uploaded;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "No updates provided",
      });
    }

    const { supabaseClient } = await import("./config.js");
    const { data, error } = await supabaseClient
      .from("users")
      .update(updates)
      .eq("google_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      return res.status(500).json({
        error: "Failed to update user",
        details: error.message,
      });
    }

    console.log(`✅ Admin updated user ${userId}:`, updates);
    res.json({ user: data });
  } catch (err) {
    console.error("Error in /admin/users/:userId:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
});

/**
 * ==================================================================
 * START THE SERVER
 * ==================================================================
 */
async function startServer() {
  try {
    console.log("Starting RAG application server...");

    // NOTE: We no longer automatically ingest a PDF on startup.
    // Users should upload their own PDFs via the /upload_pdf endpoint.
    // If you want to use the default PDF, uncomment the line below:
    // await ensureVectorStoreIsReady();

    app.listen(PORT, () => {
      console.log(
        `\n----------------------------------------\n` +
          `Server is running on http://localhost:${PORT}\n` +
          `Ready to receive PDF uploads!\n` +
          `----------------------------------------`
      );
    });
  } catch (err) {
    console.error("\n--- A FATAL ERROR OCCURRED ON STARTUP ---");
    console.error(err);
    process.exit(1);
  }
}

// Run the server
startServer();