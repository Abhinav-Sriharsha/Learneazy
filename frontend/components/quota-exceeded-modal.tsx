"use client"

import React from 'react'
import { X, AlertTriangle, Key } from 'lucide-react'
import { FREE_TIER_LIMITS } from '@/lib/supabase'

interface QuotaExceededModalProps {
  open: boolean
  onClose: () => void
  onAddKeys: () => void
  queriesUsed: number
  pdfsUsed: number
}

export function QuotaExceededModal({
  open,
  onClose,
  onAddKeys,
  queriesUsed,
  pdfsUsed,
}: QuotaExceededModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Free Quota Exceeded</h2>
              <p className="text-sm text-white/90">Upgrade to continue using Learneazy</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-gray-700">
              You've used all your free queries for this session.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Queries used:</span>
                <span className="font-semibold text-gray-900">
                  {queriesUsed} / {FREE_TIER_LIMITS.MAX_QUERIES}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">PDFs uploaded:</span>
                <span className="font-semibold text-gray-900">
                  {pdfsUsed} / {FREE_TIER_LIMITS.MAX_PDF_UPLOADS}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Continue with unlimited usage
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add your own API keys to unlock unlimited queries and PDF uploads.
              Your keys are stored only in your browser - we never see them!
            </p>

            <button
              onClick={() => {
                onClose()
                onAddKeys()
              }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-blue-700 transition"
            >
              <Key className="w-5 h-5" />
              Add Your API Keys
            </button>

            <p className="text-xs text-center text-gray-500 mt-3">
              Free Google Gemini & Cohere API keys available
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
