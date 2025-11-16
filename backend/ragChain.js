import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";
import { z } from "zod";
import { llm, embeddings, getCurrentDatasetTag } from "./config.js";
import { vectorStore } from "./vectorStore.js";
import {
  createAgent,
  tool,
  dynamicSystemPromptMiddleware,
} from "langchain";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";

/**
 * ==================================================================
 * AGENT TOOLS (tocTool, chunkSearchTool, summaryTool)
 * ==================================================================
 */
const tocTool = tool(
  async ({ query }) => {
    console.log("--- AGENT: Calling ToC Tool (as a static lookup) ---");
    const currentTag = getCurrentDatasetTag();
    console.log(`📌 Using dataset tag: ${currentTag}`);
    const staticQuery = "Table of Contents for the book";
    const retriever = vectorStore.asRetriever({
      k: 1,
      filter: {
        doc_type: "toc_full",
        dataset_tag: currentTag,
      },
    });

    const results = await retriever.invoke(staticQuery);
    if (results.length === 0) {
      return "Error: Could not find the Table of Contents document. Please check ingestion.";
    }
    return results[0].pageContent;
  },
  {
    name: "get_table_of_contents",
    description:
      "Useful for answering high-level questions about the document structure, such as 'how many chapters/sections are there?', 'what topics does this cover?', or 'what's the structure of this document?'.",
    schema: z.object({
      query: z
        .string()
        .describe("The user's question about the document structure."),
    }),
  }
);

const chunkSearchTool = tool(
  async ({ chapter, query }) => {
    console.log(
      `--- AGENT: Calling Chunk Search Tool (Chapter: ${chapter}, Query: ${query}) ---`
    );
    const chapterString = String(chapter);
    const currentTag = getCurrentDatasetTag();
    console.log(`📌 Using dataset tag: ${currentTag}`);
    const expandedQuery = `technical explanation of '${query}' and its applications (e.g., 'linear layer', 'parameters', 'implementation')`;
    const retriever = vectorStore.asRetriever({
      k: 4,
      filter: {
        doc_type: "chunk",
        chapter: chapterString,
        dataset_tag: currentTag,
      },
    });

    const [originalResults, expandedResults] = await Promise.all([
      retriever.invoke(query),
      retriever.invoke(expandedQuery),
    ]);

    const allResults = [...originalResults, ...expandedResults];
    const uniqueContents = new Set(allResults.map((doc) => doc.pageContent));
    const finalContext = Array.from(uniqueContents).join("\n\n---\n\n");

    if (finalContext.length === 0) {
      return `No content found in Chapter ${chapterString} for query: "${query}".`;
    }
    console.log(
      `...Retrieved ${uniqueContents.size} unique chunks for context.`
    );
    return finalContext;
  },
  {
    name: "search_within_chapter",
    description:
      "Searches within a specific chapter or section for detailed questions. Use chapter '1' for simple documents without chapters. Examples: 'What does this say about X?', 'Explain Y', 'What is Z?'.",
    schema: z.object({
      chapter: z
        .string()
        .describe("Chapter number (e.g., '1', '2', '3'). Use '1' for simple documents."),
      query: z.string().describe("Specific question about the content."),
    }),
  }
);

const summaryTool = tool(
  async ({ chapter }) => {
    console.log(`--- AGENT: Calling Summary Tool (Chapter: ${chapter}) ---`);
    const chapterString = String(chapter);
    const currentTag = getCurrentDatasetTag();
    console.log(`📌 Using dataset tag: ${currentTag}`);

    // 1️⃣ Check cache with debugging
    console.log(`🔍 Searching for cached summary with filter:`, {
      doc_type: "summary",
      chapter: chapterString,
      dataset_tag: currentTag,
    });
    
    const summaryRetriever = vectorStore.asRetriever({
      k: 1,
      filter: {
        doc_type: "summary",
        chapter: chapterString,
        dataset_tag: getCurrentDatasetTag(),
      },
    });
    
    const cached = await summaryRetriever.invoke("summary");
    console.log(`📊 Found ${cached.length} cached summaries`);
    
    if (cached.length > 0) {
      console.log("✅ Found cached summary!");
      return cached[0].pageContent;
    }

    // 2️⃣ Generate new summary with debugging
    console.log("⚙️ Generating summary on-demand...");
    console.log(`🔍 Searching for chunks with filter:`, {
      doc_type: "chunk",
      chapter: chapterString,
      dataset_tag: currentTag,
    });
    
    const chapterChunkRetriever = vectorStore.asRetriever({
      k: 50,
      filter: {
        doc_type: "chunk",
        chapter: chapterString,
        dataset_tag: getCurrentDatasetTag(),
      },
    });
    
    const chunks = await chapterChunkRetriever.invoke("all content");
    console.log(`📊 Found ${chunks.length} chunks for Chapter ${chapterString}`);
    
    if (chunks.length === 0) {
      console.error(`❌ No chunks found for Chapter ${chapterString}`);
      console.log(`💡 Try checking:
        1. Is the chapter number correct?
        2. Are chunks ingested with chapter metadata?
        3. Does dataset_tag match: ${currentTag}?`);
      return `No content found for Chapter ${chapterString}. Please verify the chapter number and that content has been ingested.`;
    }

    const chapterText = chunks.map((doc) => doc.pageContent).join("\n\n");

    const summarizerPrompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are an expert summarizer. Summarize the chapter's key points in clear, concise language.",
      ],
      ["human", "Summarize this text:\n\n{content}"],
    ]);

    const summarizerChain = summarizerPrompt
      .pipe(llm)
      .pipe(new StringOutputParser());
    const newSummary = await summarizerChain.invoke({ content: chapterText });

    // 3️⃣ Cache the result
    const summaryDoc = new Document({
      pageContent: newSummary,
      metadata: {
        doc_type: "summary",
        chapter: chapterString,
        dataset_tag: getCurrentDatasetTag(),
        source: "generated",
      },
    });
    await vectorStore.addDocuments([summaryDoc]);
    console.log("✅ Summary cached successfully!");

    return newSummary;
  },
  {
    name: "get_chapter_summary",
    description:
      "Summarizes an entire chapter or the whole document and identifies its key ideas and definitions. Use chapter '1' to summarize simple documents without chapters.",
    schema: z.object({
      chapter: z.string().describe("Chapter number to summarize (use '1' for simple documents)."),
    }),
  }
);

/**
 * ==================================================================
 * MAIN CHAT AGENT
 * ==================================================================
 */
const tools = [tocTool, chunkSearchTool, summaryTool];

export const agent = createAgent({
  model: llm,
  tools,
  middleware: [
    dynamicSystemPromptMiddleware((state, runtime) => {
      return `
You are a helpful and expert 'Reading Assistant'. Your job is to answer the user's questions about a document (textbook, paper, or any PDF) by intelligently using the tools provided.

You have access to the following tools:
1.  **get_table_of_contents**: For structural questions (e.g., "how many chapters", "what's the structure").
2.  **get_chapter_summary**: For high-level summaries. Use chapter "1" for simple documents without chapters.
3.  **search_within_chapter**: For specific, detailed questions. Use chapter "1" for simple documents without chapters.

--- YOUR EXECUTION FLOW ---
1.  **Analyze:** The user will ask a question.
2.  **Choose Tool:** You will choose **one** of the three tools to answer the question.
3.  **Call Tool:** You will call that tool with the correct arguments.
4.  **Receive Context:** You will receive the information from the tool as a 'tool' message.
5.  **Synthesize and Answer:** This is your **FINAL STEP**. You *must* synthesize the information from the 'tool' message into a final, human-readable, conversational answer for the user.
6.  **STOP:** Do not call any more tools.

--- CRITICAL RULES ---
1.  **NO LOOPS:** You must **NEVER** call a tool after you have already received a 'tool' message. Your one and only job after receiving tool output is to provide a final answer.
2.  **BE CONVERSATIONAL:** Do not just list your search results. Explain the concepts clearly, as a helpful tutor would.
3.  **NO JSON:** Your final answer must be a plain-text, conversational response (use Markdown for formatting, like **bold** or lists).
4.  **STICK TO THE TOOLS:** Do not answer from general knowledge. If the tools do not provide an answer, state that the information is not in the document.
5.  **ADAPT TO DOCUMENT TYPE:** If the document has only one chapter (Chapter 1: Full Document), treat it as a single document rather than a textbook. Use natural language like "this document" or "the paper" instead of "Chapter 1".
`;
    }),
  ],
});

/**
 * ==================================================================
 * FLASHCARD GENERATION CHAIN
 * ==================================================================
 */

// Schemas
const flashcardSchema = z.object({
  cards: z
    .array(
      z.object({
        question: z.string().describe("The question/term for the flashcard"),
        answer: z.string().describe("The answer/definition for the flashcard"),
      })
    )
    .describe("An array of question-and-answer flashcards"),
});

const topicSchema = z.object({
  topics: z.array(z.string()).describe("An array of key topics or terms"),
});

// Topic Extraction Chain
const topicExtractorChain = RunnableSequence.from([
  ChatPromptTemplate.fromMessages([
    [
      "system", 
      `You are an expert at identifying key concepts from technical content. 
Extract the {count} most important concepts, terms, algorithms, or techniques from the summary.
Focus on:
- Specific technical terms and definitions
- Key algorithms or methods
- Important formulas or equations  
- Core concepts that students should memorize
- Practical applications or implementations

Be SPECIFIC - instead of "neural networks", say "backpropagation algorithm" or "activation functions".`
    ],
    ["human", "Summary:\n{summary}"],
  ]),
  llm.withStructuredOutput(topicSchema, { name: "topic_extractor" }),
]);

// Flashcard Generator Chain
const flashcardGeneratorChain = RunnableSequence.from([
  ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert at creating high-quality educational flashcards.

CRITICAL RULES FOR FLASHCARD FORMAT:
1. Each flashcard has ONE question and ONE answer
2. The question should be a single, clear question about a specific concept
3. The answer should directly respond to that one question (2-4 sentences)
4. DO NOT include multiple questions in the question field
5. DO NOT include multiple separate concepts in one flashcard

CONTENT QUALITY RULES:
1. Questions MUST be SPECIFIC and based on the actual content provided
2. Questions should test understanding, not just recall of chapter titles
3. Include technical details, formulas, examples from the context
4. Answers should be concise but complete (2-4 sentences)
5. NO generic questions like "What are the topics of Chapter X?"

GOOD EXAMPLES:
- question: "What is the purpose of the ReLU activation function?"
  answer: "ReLU (Rectified Linear Unit) introduces non-linearity while being computationally efficient. It outputs the input if positive, otherwise zero, helping networks learn complex patterns."

- question: "How does backpropagation calculate gradients?"
  answer: "Backpropagation uses the chain rule to compute gradients by propagating errors backward through the network, calculating how each parameter contributed to the final loss."

BAD EXAMPLES:
- question: "What topics are covered in this chapter?" (too generic)
- question: "What is neural networks?" (no context from the chapter)
- question: "What is attention? And why is it used?" (TWO questions - split into separate flashcards)`,
    ],
    [
      "human",
      `Context from the chapter:
{context}

Generate exactly {count} high-quality flashcards. Each flashcard must have ONE clear question and ONE complete answer that addresses only that question.`,
    ],
  ]),
  llm.withStructuredOutput(flashcardSchema, { name: "flashcard_generator" }),
]);

// Main Flashcard Chain
export const flashcardChain = RunnableSequence.from([
  // Step 1: Get summary
  RunnablePassthrough.assign({
    summary: async (input) => {
      console.log(`⚙️ Step 1: Getting summary for Chapter ${input.chapter}`);
      const summary = await summaryTool.invoke({ chapter: String(input.chapter) });
      console.log(`✅ Summary retrieved (${summary.length} chars)`);
      return summary;
    },
  }),

  // Step 2: Extract key topics (more than needed to have variety)
  RunnablePassthrough.assign({
    topics: async (input) => {
      console.log(`⚙️ Step 2: Extracting key topics from summary`);
      // Extract 2x the topics we need for better coverage
      const extractCount = Math.min(input.count * 2, 10);
      const result = await topicExtractorChain.invoke({
        summary: input.summary,
        count: extractCount,
      });
      console.log(`✅ Extracted topics:`, result.topics);
      return result;
    },
  }),

  // Step 3: Get detailed context for topics
  RunnablePassthrough.assign({
    context: async (input) => {
      console.log(`⚙️ Step 3: Retrieving detailed context for topics`);
      const chapterString = String(input.chapter);
      const { topics } = input.topics;

      // Retrieve more chunks per topic for better context
      const retriever = vectorStore.asRetriever({
        k: 4, // Increased from 3
        filter: {
          doc_type: "chunk",
          chapter: chapterString,
          dataset_tag: getCurrentDatasetTag(),
        },
      });

      // Parallel retrieval
      const retrievalPromises = topics.map((topic) => retriever.invoke(topic));
      const results = await Promise.all(retrievalPromises);

      // Combine and deduplicate
      const allChunks = results.flat();
      const uniqueContents = new Set(allChunks.map((doc) => doc.pageContent));
      const finalContext = Array.from(uniqueContents).join("\n\n---\n\n");

      console.log(`✅ Retrieved ${uniqueContents.size} unique chunks (${finalContext.length} chars)`);

      if (finalContext.length === 0) {
        throw new Error(
          `No detailed context found for topics in Chapter ${chapterString}.`
        );
      }
      
      // Also include the summary for additional context
      return `CHAPTER SUMMARY:\n${input.summary}\n\n===\n\nDETAILED CONTENT:\n${finalContext}`;
    },
  }),

  // Step 4: Generate flashcards
  async (input) => {
    console.log(`⚙️ Step 4: Generating ${input.count} flashcards`);
    const result = await flashcardGeneratorChain.invoke({
      context: input.context,
      count: input.count,
    });
    console.log(`✅ Generated ${result.cards.length} flashcards`);
    return result;
  },
]);