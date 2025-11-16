"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Loader, X, BookOpen, Upload, FileText, Database, CheckCircle, Key, LogIn, LogOut, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { ApiKeysModal } from "./api-keys-modal";
import { QuotaExceededModal } from "./quota-exceeded-modal";
import { AdminDashboard } from "./admin-dashboard";

interface Message {
  role: "human" | "ai";
  content: string;
}

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardSet {
  chapter: string;
  totalQuestions: number;
  currentIndex: number;
  cards: Flashcard[];
  showAnswer: boolean;
}

// --- REMOVED markdownStyles and applySketchyFont ---

// Get backend URL from environment variable at runtime
const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: check if we're on localhost or deployed
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && !process.env.NEXT_PUBLIC_BACKEND_URL) {
      console.warn('NEXT_PUBLIC_BACKEND_URL not set in production!');
    }
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
};

const BACKEND_URL = getBackendUrl();

export default function ChatbotUI() {
  // Auth context
  const { user, supabaseUser, loading, signIn, signOut, hasOwnKeys, queriesRemaining, pdfsRemaining, refreshUser } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcardSetup, setFlashcardSetup] = useState<{
    chapter: string;
    questions: number;
  } | null>({ chapter: "", questions: 5 });
  const [flashcards, setFlashcards] = useState<FlashcardSet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentPdfName, setCurrentPdfName] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);

  // Modal states
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Admin check - Replace with your actual admin email
  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "your-admin-email@gmail.com";
  const isAdmin = user?.email === ADMIN_EMAIL;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load PDF state and chat messages from localStorage on mount
  useEffect(() => {
    const savedPdfState = localStorage.getItem("pdfUploaded");
    const savedPdfName = localStorage.getItem("currentPdfName");
    const savedMessages = localStorage.getItem("chatMessages");

    if (savedPdfState === "true" && savedPdfName) {
      setPdfUploaded(true);
      setCurrentPdfName(savedPdfName);
    }

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages)) {
          setMessages(parsedMessages);
        }
      } catch (error) {
        console.error("Failed to parse saved messages:", error);
      }
    }
  }, []);

  // Save PDF state to localStorage whenever it changes
  useEffect(() => {
    if (pdfUploaded && currentPdfName) {
      localStorage.setItem("pdfUploaded", "true");
      localStorage.setItem("currentPdfName", currentPdfName);
    }
  }, [pdfUploaded, currentPdfName]);

  // Save chat messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]?.type === "application/pdf") {
      setAttachedFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files[0]?.type === "application/pdf") {
      setAttachedFile(files[0]);
    }
  };

  const handleUploadPdf = async () => {
    if (!attachedFile) return;

    // Check if user is signed in
    if (!supabaseUser) {
      setUploadError("Please sign in to upload PDFs");
      return;
    }

    setUploadingPdf(true);
    setUploadError(null);
    setProcessingStage(0);

    try {
      // Get user API keys from localStorage
      const userGoogleKey = localStorage.getItem('userGoogleKey');
      const userCohereKey = localStorage.getItem('userCohereKey');

      // Check PDF quota BEFORE starting upload
      const quotaCheckResponse = await fetch(`${BACKEND_URL}/check_pdf_quota`, {
        headers: {
          "x-user-id": supabaseUser.id,
          ...(userGoogleKey && { "x-user-google-key": userGoogleKey }),
          ...(userCohereKey && { "x-user-cohere-key": userCohereKey }),
        },
      });

      if (!quotaCheckResponse.ok) {
        throw new Error("Failed to check PDF quota");
      }

      const quotaData = await quotaCheckResponse.json();

      // If quota check fails, show modal and stop
      if (!quotaData.canUpload) {
        setShowQuotaModal(true);
        setUploadingPdf(false);
        setProcessingStage(0);
        await refreshUser(); // Refresh quota counts
        return;
      }

      const formData = new FormData();
      formData.append("pdf", attachedFile);

      // Stage 1: Uploading
      setProcessingStage(1);
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await fetch(`${BACKEND_URL}/upload_pdf`, {
        method: "POST",
        headers: {
          "x-user-id": supabaseUser.id,
          ...(userGoogleKey && { "x-user-google-key": userGoogleKey }),
          ...(userCohereKey && { "x-user-cohere-key": userCohereKey }),
        },
        body: formData,
      });

      if (response.status === 403) {
        const error = await response.json();
        setShowQuotaModal(true);
        setProcessingStage(0);
        setUploadingPdf(false);
        await refreshUser(); // Refresh quota counts
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload PDF");
      }

      // Stage 2: Analyzing
      setProcessingStage(2);
      await new Promise(resolve => setTimeout(resolve, 800));

      const data = await response.json();

      // Stage 3: Indexing
      setProcessingStage(3);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stage 4: Complete
      setProcessingStage(4);
      await new Promise(resolve => setTimeout(resolve, 600));

      setPdfUploaded(true);
      setCurrentPdfName(attachedFile.name);
      setAttachedFile(null);
      console.log("PDF uploaded successfully:", data);
    } catch (error) {
      console.error("Error uploading PDF:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload PDF");
      setProcessingStage(0);
    } finally {
      setTimeout(() => {
        setUploadingPdf(false);
        setProcessingStage(0);
      }, 400);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Check if user is signed in
    if (!supabaseUser) {
      const errorMessage: Message = {
        role: "ai",
        content: "Please sign in to ask questions.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const humanMessage: Message = { role: "human", content: input };

    const historyForAPI = messages
      .slice(-6)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    setMessages((prev) => [...prev, humanMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get user API keys from localStorage
      const userGoogleKey = localStorage.getItem('userGoogleKey');
      const userCohereKey = localStorage.getItem('userCohereKey');

      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": supabaseUser.id,
          ...(userGoogleKey && { "x-user-google-key": userGoogleKey }),
          ...(userCohereKey && { "x-user-cohere-key": userCohereKey }),
        },
        body: JSON.stringify({ question: input, history: historyForAPI }),
      });

      if (response.status === 403) {
        const error = await response.json();
        setShowQuotaModal(true);
        await refreshUser(); // Refresh quota counts
        setIsLoading(false);
        return;
      }

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      const aiMessage: Message = { role: "ai", content: data.answer };
      setMessages((prev) => [...prev, aiMessage]);
      await refreshUser(); // Update quota count after successful query
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        role: "ai",
        content: "Sorry, I couldn't connect to the server.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateFlashcards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flashcardSetup?.chapter || !flashcardSetup?.questions) return;

    // Check if user is signed in
    if (!supabaseUser) {
      alert("Please sign in to generate flashcards");
      return;
    }

    setIsGenerating(true);

    try {
      // Get user API keys from localStorage
      const userGoogleKey = localStorage.getItem('userGoogleKey');
      const userCohereKey = localStorage.getItem('userCohereKey');

      const response = await fetch(`${BACKEND_URL}/generate_flashcards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": supabaseUser.id,
          ...(userGoogleKey && { "x-user-google-key": userGoogleKey }),
          ...(userCohereKey && { "x-user-cohere-key": userCohereKey }),
        },
        body: JSON.stringify({
          chapter: flashcardSetup.chapter,
          count: flashcardSetup.questions,
        }),
      });

      if (response.status === 403) {
        const error = await response.json();
        setShowQuotaModal(true);
        await refreshUser(); // Refresh quota counts
        setIsGenerating(false);
        return;
      }

      if (!response.ok) throw new Error("Failed to generate flashcards");

      const data = await response.json();

      if (!data.cards || data.cards.length === 0) {
        throw new Error("No flashcards were returned from the server.");
      }

      setFlashcards({
        chapter: flashcardSetup.chapter,
        totalQuestions: data.cards.length,
        currentIndex: 0,
        cards: data.cards,
        showAnswer: false,
      });
      setFlashcardSetup(null);
      await refreshUser(); // Update quota count after successful generation
    } catch (error) {
      console.error("Error generating flashcards:", error);
      alert("Failed to generate flashcards. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNextCard = () => {
    if (flashcards && flashcards.currentIndex < flashcards.cards.length - 1) {
      setFlashcards({
        ...flashcards,
        currentIndex: flashcards.currentIndex + 1,
        showAnswer: false,
      });
    }
  };

  const handlePrevCard = () => {
    if (flashcards && flashcards.currentIndex > 0) {
      setFlashcards({
        ...flashcards,
        currentIndex: flashcards.currentIndex - 1,
        showAnswer: false,
      });
    }
  };

  // --- PROCESSING ANIMATION INLINE ---
  const ProcessingAnimation = () => {
    const stages = [
      { id: 1, icon: Upload, label: "Uploading PDF", color: "text-blue-600" },
      { id: 2, icon: FileText, label: "Analyzing Content", color: "text-blue-600" },
      { id: 3, icon: Database, label: "Indexing Data", color: "text-blue-600" },
      { id: 4, icon: CheckCircle, label: "Ready!", color: "text-green-600" },
    ];

    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-8 shadow-lg">
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="relative">
              <div className="flex justify-between mb-4">
                {stages.map((stage) => (
                  <div key={stage.id} className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                        processingStage >= stage.id
                          ? stage.id === 4
                            ? "bg-green-100 scale-110"
                            : "bg-blue-100 scale-110"
                          : "bg-gray-100 scale-90"
                      }`}
                    >
                      <stage.icon
                        className={`w-6 h-6 transition-all duration-500 ${
                          processingStage >= stage.id
                            ? stage.color
                            : "text-gray-400"
                        } ${
                          processingStage === stage.id && stage.id !== 4
                            ? "animate-pulse"
                            : ""
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Connecting line */}
              <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 -z-10" style={{ width: 'calc(100% - 48px)', marginLeft: '24px' }}>
                <div
                  className="h-full bg-blue-600 transition-all duration-500 ease-out"
                  style={{ width: `${((processingStage - 1) / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* Current stage label */}
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {stages.find(s => s.id === processingStage)?.label || "Processing..."}
              </h3>
              <p className="text-sm text-gray-500">
                {processingStage === 1 && "Sending your PDF to the server..."}
                {processingStage === 2 && "Extracting chapters and content..."}
                {processingStage === 3 && "Creating searchable embeddings..."}
                {processingStage === 4 && "Your PDF is ready to use!"}
              </p>
            </div>

            {/* Animated dots for non-complete stages */}
            {processingStage < 4 && (
              <div className="flex justify-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- RENDER FLASHCARD MODALS ---
  if (showFlashcards && !flashcards) {
    return (
      // Use standard font
      <div className="flex h-screen flex-col bg-white text-black">
        {/* Removed style tag */}
        <div className="border-b border-gray-200 px-6 py-4"> {/* Standard border */}
          <button
            onClick={() => setShowFlashcards(false)}
            className="mb-4 rounded-lg border border-gray-300 px-4 py-2 font-semibold hover:bg-gray-100 transition"
          >
            ← Back
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6">
          <div
            className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-8 shadow-lg" // Removed rotate/sketchy
          >
            <h2 className="mb-8 text-2xl font-semibold">Create Flashcards</h2> {/* Adjusted font */}
            <form onSubmit={handleGenerateFlashcards} className="space-y-6">
              <div>
                <label className="mb-2 block text-base font-medium">Chapter</label> {/* Adjusted font */}
                <input
                  type="text"
                  placeholder="e.g., Chapter 3"
                  value={flashcardSetup?.chapter || ""}
                  onChange={(e) =>
                    setFlashcardSetup({
                      ...flashcardSetup,
                      chapter: e.target.value,
                      questions: flashcardSetup?.questions || 5,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" // Standard input
                />
              </div>
              <div>
                <label className="mb-2 block text-base font-medium">Number of Questions</label> {/* Adjusted font */}
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={flashcardSetup?.questions || 5}
                  onChange={(e) =>
                    setFlashcardSetup({
                      ...flashcardSetup,
                      chapter: flashcardSetup?.chapter || "",
                      questions: Number.parseInt(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500" // Standard input
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFlashcards(false)}
                  disabled={isGenerating}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-semibold transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !flashcardSetup?.chapter}
                  className="flex-1 rounded-lg border border-transparent bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? (
                     <Loader className="h-6 w-6 animate-spin mx-auto" />
                  ) : (
                    "Generate"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (showFlashcards && flashcards) {
    return (
      <div className="flex h-screen flex-col bg-white text-black">
        {/* Removed style tag */}
        <div className="border-b border-gray-200 px-6 py-4"> {/* Standard border */}
          <button
            onClick={() => {
              setShowFlashcards(false);
              setFlashcards(null);
            }}
            className="mb-4 rounded-lg border border-gray-300 px-4 py-2 font-semibold hover:bg-gray-100 transition"
          >
            ← Back to Chat
          </button>
          <h1 className="text-2xl font-semibold">Flashcards: {flashcards.chapter}</h1> {/* Adjusted font */}
          <p className="text-base text-gray-500"> {/* Adjusted font */}
            Question {flashcards.currentIndex + 1} of {flashcards.totalQuestions}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          {/* --- THIS IS THE FIX --- */}
          <div
            className={`w-full max-w-2xl rounded-lg border border-gray-300 p-8 shadow-lg transition-all cursor-pointer ${
              flashcards.showAnswer ? "bg-blue-50" : "bg-white" // Conditional background
            }`}
            onClick={() => setFlashcards({ ...flashcards, showAnswer: !flashcards.showAnswer })}
          >
            <div className="min-h-64 flex flex-col justify-between">
              {/* 1. Top Label (Question/Answer) */}
              <div>
                <p className="text-lg font-bold text-blue-600">
                  {flashcards.showAnswer ? "Answer:" : "Question:"}
                </p>
                <div className="mt-4 text-center text-2xl font-semibold leading-relaxed prose">
                  <ReactMarkdown>
                    {flashcards.showAnswer
                      ? flashcards.cards[flashcards.currentIndex].answer
                      : flashcards.cards[flashcards.currentIndex].question}
                  </ReactMarkdown>
                </div>
              </div>
              
              {/* 2. Bottom Label (Click to flip) */}
              <p className="text-center text-sm font-medium text-gray-400 mt-8">
                Click to flip
              </p>
            </div>
          </div>
          {/* --- END OF FIX --- */}
        </div>

        <div className="border-t border-gray-200 px-6 py-6"> {/* Standard border */}
          <div className="mx-auto max-w-2xl flex items-center justify-between gap-4">
            <button
              onClick={handlePrevCard}
              disabled={flashcards.currentIndex === 0}
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold transition hover:bg-gray-100 disabled:opacity-50"
            >
              ← Previous
            </button>
            <span className="text-base font-semibold"> {/* Adjusted font */}
              {flashcards.currentIndex + 1} / {flashcards.totalQuestions}
            </span>
            <button
              onClick={handleNextCard}
              disabled={flashcards.currentIndex === flashcards.cards.length - 1}
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold transition hover:bg-gray-100 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN CHAT UI ---
  return (
    <div className="flex h-screen flex-col bg-white text-black">
      {/* Removed style tag */}
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Learneazy.io</h1>
          <p className="text-sm text-gray-500">Step up your learning game!</p>
        </div>

        <div className="flex items-center gap-3">
          {user && pdfUploaded && currentPdfName && !showWelcomeScreen && (
            <>
              <button
                onClick={() => setShowWelcomeScreen(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
              <button
                onClick={() => {
                  setShowFlashcards(true);
                  setFlashcardSetup({ chapter: "", questions: 5 });
                  setFlashcards(null);
                }}
                className="flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <BookOpen className="h-4 w-4" />
                Create Flashcards
              </button>
              <button
                onClick={() => {
                  setPdfUploaded(false);
                  setCurrentPdfName(null);
                  setMessages([]);
                  setFlashcards(null);
                  setShowWelcomeScreen(false);
                  localStorage.removeItem("pdfUploaded");
                  localStorage.removeItem("currentPdfName");
                  localStorage.removeItem("chatMessages");
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100"
              >
                Upload New PDF
              </button>
            </>
          )}

          {user && (
            <>
              {isAdmin && (
                <button
                  onClick={() => setShowAdminDashboard(true)}
                  className="flex items-center gap-2 rounded-lg border border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                  title="Admin Dashboard"
                >
                  <User className="h-4 w-4" />
                  Admin
                </button>
              )}
              <button
                onClick={() => setShowApiKeysModal(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100"
                title="Manage API Keys"
              >
                <Key className="h-4 w-4" />
                {hasOwnKeys ? "API Keys" : "Settings"}
              </button>
            </>
          )}

          {!user ? (
            <button
              onClick={signIn}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {user.photo_url && (
                <img
                  src={user.photo_url}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full border-2 border-gray-200"
                />
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {(messages.length === 0 || showWelcomeScreen) ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12"> {/* Adjusted gap */}
            {!pdfUploaded ? (
              <>
                {!user ? (
                  <>
                    <h2 className="text-balance text-3xl font-semibold">Welcome to Learneazy.io</h2>
                    <p className="text-gray-600 text-center max-w-md">
                      Sign in to start chatting with your PDFs and creating flashcards!
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
                      <h3 className="font-semibold text-blue-900 mb-3">Free Tier Includes:</h3>
                      <ul className="text-sm text-blue-800 space-y-2">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                          <span>5 free queries (chat + flashcards)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                          <span>1 free PDF upload</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                          <span>Add your own API keys for unlimited usage</span>
                        </li>
                      </ul>
                    </div>
                    <button
                      onClick={signIn}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-lg border border-transparent bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      <LogIn className="h-5 w-5" />
                      Sign In with Google
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-balance text-3xl font-semibold">Upload a PDF to get started</h2>
                    <p className="text-gray-600 text-center max-w-md">
                      Upload a textbook or any PDF document. I'll analyze it and help you chat with the content and create flashcards!
                    </p>
                    {!hasOwnKeys && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md text-sm text-yellow-800">
                        <strong>Free tier:</strong> {pdfsRemaining} PDF upload and {queriesRemaining} queries remaining.
                        <button
                          onClick={() => setShowApiKeysModal(true)}
                          className="text-blue-600 hover:underline ml-1 font-semibold"
                        >
                          Add your API keys for unlimited usage
                        </button>
                      </div>
                    )}

                    <div className="w-full max-w-md">
                  {uploadingPdf && processingStage > 0 ? (
                    <ProcessingAnimation />
                  ) : attachedFile ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-green-100 p-4">
                        <Paperclip className="h-5 w-5 text-black" />
                        <span className="flex-1 text-base font-medium text-black">{attachedFile.name}</span>
                        <button onClick={() => setAttachedFile(null)} className="text-black transition hover:opacity-70">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      {uploadError && (
                        <div className="text-red-600 text-sm text-center">{uploadError}</div>
                      )}
                      <button
                        onClick={handleUploadPdf}
                        disabled={uploadingPdf}
                        className="w-full rounded-lg border border-transparent bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        Upload and Process PDF
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition ${
                        dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <Paperclip className="h-12 w-12 text-gray-400" />
                      <p className="text-gray-600 text-center">
                        Drag and drop a PDF here, or
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-gray-300 px-6 py-2 font-semibold transition hover:bg-gray-100"
                      >
                        Browse Files
                      </button>
                      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                    </div>
                  )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <h2 className="text-balance text-3xl font-semibold">
                  {messages.length > 0 ? "Welcome back!" : "What can I help you with?"}
                </h2>
                {currentPdfName && (
                  <p className="text-sm text-gray-600">Currently working with: <span className="font-semibold">{currentPdfName}</span></p>
                )}

                {messages.length > 0 ? (
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowWelcomeScreen(false)}
                      className="flex items-center gap-2 rounded-lg border border-transparent bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-700"
                    >
                      Continue Chat
                    </button>
                    <button
                      onClick={() => {
                        setMessages([]);
                        localStorage.removeItem("chatMessages");
                        setShowWelcomeScreen(false);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-8 py-4 text-lg font-semibold transition hover:bg-gray-100"
                    >
                      Start New Chat
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-full max-w-2xl">
                      <form onSubmit={handleSubmit}>
                        <div
                          className="flex items-center gap-3 rounded-lg border border-gray-300 p-3 transition bg-white hover:bg-gray-50"
                        >
                          <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            placeholder="Message..."
                            className="flex-1 bg-transparent text-base outline-none placeholder-gray-500 disabled:opacity-50"
                          />

                          <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="flex items-center justify-center text-blue-600 transition hover:text-blue-800 disabled:opacity-30"
                          >
                            {isLoading ? <Loader className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                          </button>
                        </div>
                      </form>
                    </div>

                    <button
                      onClick={() => setShowFlashcards(true)}
                      className="mt-4 flex items-center gap-3 rounded-lg border border-transparent bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
                    >
                      <BookOpen className="h-5 w-5" />
                      Create Flashcards
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-3">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "human" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={
                      `max-w-xl rounded-lg px-4 py-2 text-base ` + // --- TIGHTER PADDING ---
                      (message.role === "human" ? "bg-blue-100 text-black" : "bg-gray-100 text-black") // Standard colors
                    }
                    // Removed rotate style
                  >
                    <div className="prose"> {/* Standard prose */}
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-3"> {/* Standard loading bubble */}
                    <div className="flex gap-2">
                      <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce"></div>
                      <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce delay-100"></div>
                      <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Chat input area when messages exist */}
      {messages.length > 0 && (
        <div className="border-t border-gray-200 bg-white px-6 py-4"> {/* Standard border */}
          <div className="mx-auto max-w-3xl space-y-3">
            {attachedFile && (
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-green-100 p-3"> {/* Standard border */}
                <Paperclip className="h-5 w-5 text-black" />
                <span className="flex-1 text-base font-medium text-black">{attachedFile.name}</span> {/* Standard font */}
                <button onClick={() => setAttachedFile(null)} className="text-black transition hover:opacity-70">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`flex items-end gap-2 rounded-lg border border-gray-300 transition ${ // Standard border
                  dragActive ? "bg-blue-50" : "bg-white hover:bg-gray-50"
                }`}
                // Removed rotate style
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center px-3 py-2 text-gray-500 transition hover:text-black"
                  title="Attach PDF"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  placeholder="Message..."
                  className="flex-1 bg-transparent py-3 pr-3 text-base outline-none placeholder-gray-500 disabled:opacity-50" // Standard font
                />

                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex items-center justify-center px-3 py-2 text-blue-600 transition hover:text-blue-800 disabled:opacity-30" // Standard colors
                >
                  {isLoading ? <Loader className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex items-center justify-center gap-4">
                <p className="text-center text-xs font-medium text-gray-500">
                  Can make mistakes. Consider checking important information.
                </p>
                {user && !hasOwnKeys && (
                  <p className="text-center text-xs font-medium text-gray-600 border-l border-gray-300 pl-4">
                    {queriesRemaining} free {queriesRemaining === 1 ? 'query' : 'queries'} remaining
                    <button
                      onClick={() => setShowApiKeysModal(true)}
                      className="text-blue-600 hover:underline ml-2"
                    >
                      Get unlimited
                    </button>
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <ApiKeysModal
        open={showApiKeysModal}
        onClose={() => setShowApiKeysModal(false)}
      />
      <QuotaExceededModal
        open={showQuotaModal}
        onClose={() => setShowQuotaModal(false)}
        onAddKeys={() => setShowApiKeysModal(true)}
        queriesUsed={user?.queries_used || 0}
        pdfsUsed={user?.pdfs_uploaded || 0}
      />
      {showAdminDashboard && isAdmin && supabaseUser && (
        <AdminDashboard
          onClose={() => setShowAdminDashboard(false)}
          adminEmail={user?.email || ""}
          adminId={supabaseUser.id}
        />
      )}
    </div>
  );
}