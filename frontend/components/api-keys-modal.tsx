"use client"

import React, { useState, useEffect } from 'react'
import { X, Key, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

interface ApiKeysModalProps {
  open: boolean
  onClose: () => void
}

export function ApiKeysModal({ open, onClose }: ApiKeysModalProps) {
  const [googleKey, setGoogleKey] = useState('')
  const [cohereKey, setCohereKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Load existing keys on mount
  useEffect(() => {
    if (open) {
      const existingGoogleKey = localStorage.getItem('userGoogleKey') || ''
      const existingCohereKey = localStorage.getItem('userCohereKey') || ''
      setGoogleKey(existingGoogleKey)
      setCohereKey(existingCohereKey)
      setSaved(false)
      setError('')
    }
  }, [open])

  const handleSave = () => {
    setError('')

    // Validate keys
    if (!googleKey.trim() && !cohereKey.trim()) {
      setError('Please enter at least one API key')
      return
    }

    // Validate Gemini key format
    if (googleKey.trim() && !googleKey.startsWith('AIza')) {
      setError('Invalid Google Gemini API key format. Should start with "AIza"')
      return
    }

    // Save to localStorage
    if (googleKey.trim()) {
      localStorage.setItem('userGoogleKey', googleKey.trim())
    } else {
      localStorage.removeItem('userGoogleKey')
    }

    if (cohereKey.trim()) {
      localStorage.setItem('userCohereKey', cohereKey.trim())
    } else {
      localStorage.removeItem('userCohereKey')
    }

    setSaved(true)
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  const handleClear = () => {
    localStorage.removeItem('userGoogleKey')
    localStorage.removeItem('userCohereKey')
    setGoogleKey('')
    setCohereKey('')
    setError('')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">API Keys Settings</h2>
              <p className="text-sm text-gray-500">Unlimited usage with your own keys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              How it works
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 ml-7">
              <li>• Your API keys are stored <strong>only in your browser</strong> (localStorage)</li>
              <li>• Keys are <strong>never sent to our servers</strong> or stored in our database</li>
              <li>• You get <strong>unlimited queries and PDF uploads</strong> with your own keys</li>
              <li>• Currently supports <strong>Google Gemini</strong> and <strong>Cohere</strong> APIs</li>
            </ul>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <a
                  href="https://ai.google.dev/gemini-api/docs/api-key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Get your free Gemini API key
                </a>
                <span className="text-gray-500"> (Google offers 15 RPM free tier!)</span>
              </div>
            </div>
          </div>

          {/* Cohere API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Cohere API Key
            </label>
            <input
              type="password"
              value={cohereKey}
              onChange={(e) => setCohereKey(e.target.value)}
              placeholder="..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <a
                  href="https://dashboard.cohere.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Get your Cohere API key
                </a>
                <span className="text-gray-500"> (Free trial available)</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Success Message */}
          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-800">
              <CheckCircle className="w-5 h-5" />
              API keys saved successfully! You now have unlimited usage.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
          >
            Clear Keys
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saved ? 'Saved!' : 'Save Keys'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
