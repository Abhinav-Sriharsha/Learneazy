import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { embeddings, supabaseClient } from "./config.js";

// Initialize the SupabaseVectorStore
// This object is our main interface to the database for adding and querying documents.
export const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseClient,
  tableName: "documents",
  queryName: "match_documents",
});