import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { CohereEmbeddings } from "@langchain/cohere";

// --- 1. Load Environment Variables ---
const googleApiKey = process.env.GOOGLE_API_KEY;
const cohereApiKey = process.env.COHERE_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// --- 2. Validate Environment Variables ---
if (
  !googleApiKey ||
  !cohereApiKey ||
  !supabaseUrl ||
  !supabaseServiceKey
) {
  throw new Error(
    "Missing one or more API keys in .env file. Please check GOOGLE_API_KEY, COHERE_API_KEY, SUPABASE_URL, and SUPABASE_SERVICE_KEY."
  );
}

// --- 3. Server and PDF Configuration ---
// These are the settings for your specific PDF and server
// --- IMPORTANT ---
// If you want to index a new PDF, you have two options:
// 1. (EASIEST) Change PDF_FILE_PATH, then run `TRUNCATE TABLE documents;` in your Supabase SQL Editor.
// 2. Change PDF_FILE_PATH *and* change DATASET_TAG to a new value (e.g., "pdf-doc-v2").
export const PDF_FILE_PATH =
  "Build a Large Language Model (From Scratch) MEAP V08 - Unknown (1).pdf";
export const DATASET_TAG = "pdf-doc-v2";
export const PORT = 3001; // Server port

// --- 4. Dynamic Dataset Tag Management ---
// This allows switching between different PDFs at runtime
let currentDatasetTag = DATASET_TAG;

export function getCurrentDatasetTag() {
  return process.env.CURRENT_DATASET_TAG || currentDatasetTag;
}

export function setCurrentDatasetTag(tag) {
  currentDatasetTag = tag;
  process.env.CURRENT_DATASET_TAG = tag;
}

// --- 4. Initialize and Export API Clients ---

// Default Google Gemini LLM (using server API key)
export const llm = new ChatGoogleGenerativeAI({
  apiKey: googleApiKey,
  model: "gemini-2.5-flash-preview-09-2025",
  temperature: 0.3,
});

// Default Cohere Embeddings Model (using server API key)
export const embeddings = new CohereEmbeddings({
  apiKey: cohereApiKey,
  model: "embed-english-v3.0", // 1024 dimensions
});

// --- 5. Dynamic API Client Creation ---
// Create LLM with custom API key (for users using their own keys)
export function createLLM(apiKey = googleApiKey) {
  return new ChatGoogleGenerativeAI({
    apiKey: apiKey,
    model: "gemini-2.5-flash-preview-09-2025",
    temperature: 0.3,
  });
}

// Create embeddings with custom API key (for users using their own keys)
export function createEmbeddings(apiKey = cohereApiKey) {
  return new CohereEmbeddings({
    apiKey: apiKey,
    model: "embed-english-v3.0",
  });
}

// Supabase Client
export const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);