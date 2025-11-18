import { Document } from "@langchain/core/documents";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import {
  supabaseClient,
  PDF_FILE_PATH,
  DATASET_TAG,
} from "./config.js";
import { vectorStore } from "./vectorStore.js";
import { sleep } from "./utils.js";

// Use environment variable for Python service URL (Railway internal URL in production)
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:5000/process_pdf";

// Debug logging
console.log(`🔧 Python Service URL configured: ${PYTHON_SERVICE_URL}`);
console.log(`🔧 Environment PYTHON_SERVICE_URL: ${process.env.PYTHON_SERVICE_URL || 'NOT SET'}`);

/**
 * Calls the Python service to process the PDF and get structured data.
 */
async function processPdfWithPythonService(pdfPath = PDF_FILE_PATH) {
  console.log(`📡 Calling Python PDF Processor at ${PYTHON_SERVICE_URL}...`);

  const formData = new FormData();
  formData.append("file", fs.createReadStream(pdfPath));

  try {
    const response = await axios.post(PYTHON_SERVICE_URL, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 300000, // 5 minutes
    });

    console.log("✅ Received processed data from Python service.");
    return response.data;
  } catch (err) {
    console.error("--- ERROR CALLING PYTHON SERVICE ---");
    if (err.response) console.error("Response Error:", err.response.data);
    else if (err.request) console.error("Request Error:", err.request);
    else console.error("Error:", err.message);
    throw new Error("Failed to call Python processing service. Is it running?");
  }
}

/**
 * Checks if vector store already has this dataset.
 * If not, it calls the Python PDF processor and indexes all layers.
 */
export async function ensureVectorStoreIsReady() {
  try {
    console.log(`🔍 Checking if dataset '${DATASET_TAG}' exists in Supabase...`);

    const { data: existingDocs } = await supabaseClient
      .from("documents")
      .select("id")
      .filter("metadata->>dataset_tag", "eq", DATASET_TAG)
      .limit(1);

    if (existingDocs && existingDocs.length > 0) {
      console.log(`✅ Dataset '${DATASET_TAG}' found in Supabase. Skipping ingestion.`);
      return;
    }

    console.log(`⚙️  Dataset '${DATASET_TAG}' not found. Starting new ingestion...`);

    // --- 1️⃣ Process PDF using Python ---
    // FIX: Correctly destructure the 3 keys from the Python service
    const { layer1_full_toc_doc, layer1_entry_docs, layer3_chunks } =
      await processPdfWithPythonService();

    // --- 2️⃣ Log overview (from layer 1 entries) ---
    console.log("\n📘 Chapter Overview (from ToC Entries):");
    for (const ch of layer1_entry_docs) {
      console.log(`  🔹 ${ch.content}`);
    }

    // --- 3️⃣ Index Layer 1a (Full Table of Contents) ---
    console.log("\n🧩 Indexing Layer 1a (Full ToC)...");
    const tocDoc = new Document({
      // FIX: Use layer1_full_toc_doc
      pageContent: layer1_full_toc_doc.content,
      metadata: {
        ...layer1_full_toc_doc.metadata,
        dataset_tag: DATASET_TAG,
        source: PDF_FILE_PATH,
      },
    });
    await vectorStore.addDocuments([tocDoc]);
    console.log("✅ Layer 1a indexed.");

    // --- 4️⃣ Index Layer 1b (ToC Entries) ---
    // FIX: Added this new section to index the missing layer
    console.log(`\n🧩 Indexing Layer 1b (${layer1_entry_docs.length} ToC entries)...`);
    const entryDocs = layer1_entry_docs.map(doc => new Document({
      pageContent: doc.content,
      metadata: {
        ...doc.metadata,
        dataset_tag: DATASET_TAG,
        source: PDF_FILE_PATH,
      },
    }));
    await vectorStore.addDocuments(entryDocs);
    console.log("✅ Layer 1b indexed.");


    // --- 5️⃣ Index Layer 3 (Chunks) ---
    // (This section was already correct, just re-numbered)
    console.log(`\n🧱 Indexing Layer 3 (${layer3_chunks.length} chunks)...`);
    const allChunkDocs = layer3_chunks.map(chunk => new Document({
      pageContent: chunk.content,
      metadata: {
        ...chunk.metadata,
        dataset_tag: DATASET_TAG,
        source: PDF_FILE_PATH,
      },
    }));

    const BATCH_SIZE = 100;
    for (let i = 0; i < allChunkDocs.length; i += BATCH_SIZE) {
      const batch = allChunkDocs.slice(i, i + BATCH_SIZE);
      console.log(`   → Processing batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(allChunkDocs.length / BATCH_SIZE)}`);
      await vectorStore.addDocuments(batch);
      await sleep(1000); // Avoid rate limits
    }

    console.log("\n✅ All chunks indexed successfully!");
    console.log("📦 Dataset ingestion complete.");

  } catch (err) {
    console.error("\n--- ❌ ERROR DURING INGESTION ---");
    console.error(err);
    process.exit(1);
  }
}

/**
 * Processes an uploaded PDF and indexes it into the vector store.
 * Used when users upload their own PDFs.
 */
export async function processPdfUpload(pdfPath, originalFilename) {
  try {
    // Generate a unique dataset tag for this PDF
    const timestamp = Date.now();
    const datasetTag = `uploaded-pdf-${timestamp}`;

    console.log(`\n⚙️ Processing uploaded PDF: ${originalFilename}`);
    console.log(`Dataset tag: ${datasetTag}`);

    // --- 1️⃣ Process PDF using Python ---
    const { layer1_full_toc_doc, layer1_entry_docs, layer3_chunks } =
      await processPdfWithPythonService(pdfPath);

    // --- 2️⃣ Log overview ---
    console.log("\n📘 Chapter Overview:");
    for (const ch of layer1_entry_docs) {
      console.log(`  🔹 ${ch.content}`);
    }

    // --- 3️⃣ Index Layer 1a (Full Table of Contents) ---
    console.log("\n🧩 Indexing Layer 1a (Full ToC)...");
    const tocDoc = new Document({
      pageContent: layer1_full_toc_doc.content,
      metadata: {
        ...layer1_full_toc_doc.metadata,
        dataset_tag: datasetTag,
        source: originalFilename,
      },
    });
    await vectorStore.addDocuments([tocDoc]);
    console.log("✅ Layer 1a indexed.");

    // --- 4️⃣ Index Layer 1b (ToC Entries) ---
    console.log(`\n🧩 Indexing Layer 1b (${layer1_entry_docs.length} ToC entries)...`);
    const entryDocs = layer1_entry_docs.map(doc => new Document({
      pageContent: doc.content,
      metadata: {
        ...doc.metadata,
        dataset_tag: datasetTag,
        source: originalFilename,
      },
    }));
    await vectorStore.addDocuments(entryDocs);
    console.log("✅ Layer 1b indexed.");

    // --- 5️⃣ Index Layer 3 (Chunks) ---
    console.log(`\n🧱 Indexing Layer 3 (${layer3_chunks.length} chunks)...`);
    const allChunkDocs = layer3_chunks.map(chunk => new Document({
      pageContent: chunk.content,
      metadata: {
        ...chunk.metadata,
        dataset_tag: datasetTag,
        source: originalFilename,
      },
    }));

    const BATCH_SIZE = 100;
    for (let i = 0; i < allChunkDocs.length; i += BATCH_SIZE) {
      const batch = allChunkDocs.slice(i, i + BATCH_SIZE);
      console.log(`   → Processing batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(allChunkDocs.length / BATCH_SIZE)}`);
      await vectorStore.addDocuments(batch);
      await sleep(1000);
    }

    console.log("\n✅ All chunks indexed successfully!");
    console.log("📦 PDF processing complete.");

    // Update the global dataset tag to point to this new PDF
    process.env.CURRENT_DATASET_TAG = datasetTag;

    return {
      success: true,
      datasetTag: datasetTag,
      totalChunks: layer3_chunks.length,
      chapters: layer1_entry_docs.length,
    };
  } catch (err) {
    console.error("\n--- ❌ ERROR DURING PDF UPLOAD PROCESSING ---");
    console.error(err);
    throw err;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureVectorStoreIsReady();
}