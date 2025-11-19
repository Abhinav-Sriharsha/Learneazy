"use client";

import { useState, useEffect } from "react";
import { BookOpen, Sparkles, Zap, ArrowRight, CheckCircle, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { user, signIn } = useAuth();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleGetStarted = async () => {
    if (user) {
      router.push("/chat");
    } else {
      await signIn();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Learneazy.io
            </span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={() => router.push("/chat")}
                className="px-6 py-2 rounded-lg border border-transparent bg-blue-600 text-white font-semibold transition hover:bg-blue-700"
              >
                Go to App
              </button>
            ) : (
              <button
                onClick={signIn}
                className="px-6 py-2 rounded-lg border border-gray-300 font-semibold transition hover:bg-gray-50"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6 animate-bounce">
              <Sparkles className="h-4 w-4" />
              AI-Powered Learning Assistant
            </div>

            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-tight">
              Transform PDFs into
              <br />
              Interactive Learning
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Upload any textbook or document and chat with it instantly. Create flashcards,
              get summaries, and master your study materials with AI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <button
                onClick={handleGetStarted}
                className="group px-8 py-4 rounded-lg border border-transparent bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold transition hover:shadow-2xl hover:scale-105 transform flex items-center gap-2"
              >
                Try Free Tier
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition" />
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-lg border border-gray-300 text-gray-700 text-lg font-semibold transition hover:bg-gray-50 flex items-center gap-2"
              >
                Learn More
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>5 Free Queries</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>1 Free PDF Upload</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>No Credit Card</span>
              </div>
            </div>
          </div>

          {/* Animated Demo Preview */}
          <div className={`mt-16 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-3xl opacity-20"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-800 px-6 py-3 flex items-center gap-2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-gray-400 text-sm ml-4">Learneazy.io</span>
                </div>
                <div className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-semibold">Q</span>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-lg p-4">
                      <p className="text-gray-800">What are the main topics covered in Chapter 3?</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-gray-800 leading-relaxed">
                        Chapter 3 covers three main topics: <span className="font-semibold">Machine Learning Fundamentals</span>,
                        including supervised and unsupervised learning; <span className="font-semibold">Neural Networks</span>,
                        with detailed explanations of backpropagation; and <span className="font-semibold">Deep Learning Applications</span>
                        in computer vision and NLP.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Everything you need to ace your studies
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powered by cutting-edge AI to make learning effortless and effective
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Chat with Your PDFs</h3>
              <p className="text-gray-600 leading-relaxed">
                Ask questions about any part of your textbook. Get instant, accurate answers powered by advanced RAG technology.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Generate Flashcards</h3>
              <p className="text-gray-600 leading-relaxed">
                Automatically create study flashcards from any chapter. Perfect for memorization and quick reviews.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl border border-gray-200 hover:border-pink-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Smart Summaries</h3>
              <p className="text-gray-600 leading-relaxed">
                Get concise chapter summaries and key takeaways. Save hours of reading time while retaining key concepts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Get started in 3 simple steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Upload Your PDF</h3>
              <p className="text-gray-600">
                Drag and drop any textbook, study material, or document you want to learn from.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Ask Questions</h3>
              <p className="text-gray-600">
                Chat naturally with your document. Ask about concepts, get explanations, or create flashcards.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-600 to-red-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Master the Content</h3>
              <p className="text-gray-600">
                Use AI-generated summaries and flashcards to study smarter and retain more information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">Start free, upgrade when you need more</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2 text-gray-900">Free Tier</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-600">/forever</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">5 free queries per account</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">1 PDF upload</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">All AI features included</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">No credit card required</span>
                </li>
              </ul>
              <button
                onClick={handleGetStarted}
                className="w-full px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold transition hover:bg-gray-50"
              >
                Get Started Free
              </button>
            </div>

            {/* Unlimited Tier */}
            <div className="p-8 rounded-2xl border-2 border-blue-600 bg-gradient-to-br from-blue-50 to-purple-50 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold">
                POPULAR
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2 text-gray-900">Unlimited</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900">BYO</span>
                  <span className="text-gray-600">API Keys</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited queries</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited PDF uploads</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Use your own Google & Cohere API keys</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Full control over your data</span>
                </li>
              </ul>
              <button
                onClick={handleGetStarted}
                className="w-full px-6 py-3 rounded-lg border border-transparent bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold transition hover:shadow-xl transform hover:scale-105"
              >
                Start Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to transform your learning?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of students already learning smarter with AI
          </p>
          <button
            onClick={handleGetStarted}
            className="px-10 py-4 rounded-lg border-2 border-white text-white text-lg font-semibold transition hover:bg-white hover:text-blue-600 transform hover:scale-105"
          >
            Start Learning for Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold text-white">Learneazy.io</span>
          </div>
          <p className="mb-4">AI-powered learning assistant for students</p>
          <p className="text-sm">© 2024 Learneazy.io. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
