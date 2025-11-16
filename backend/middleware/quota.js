import { supabaseClient } from '../config.js';

// Free tier limits
const FREE_TIER_LIMITS = {
  MAX_QUERIES: 5,
  MAX_PDF_UPLOADS: 1,
};

/**
 * Middleware to check user quota before processing requests
 * Supports both free tier users and users with their own API keys
 */
export async function checkQuota(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];

    // No user ID means user is not logged in
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please sign in to use this feature',
      });
    }

    // Check if user has their own API keys
    const userGoogleKey = req.headers['x-user-google-key'];
    const userCohereKey = req.headers['x-user-cohere-key'];

    if (userGoogleKey && userCohereKey) {
      // User is using their own keys - unlimited access
      console.log(`✅ User ${userId} using own API keys - unlimited access`);
      req.useUserKeys = true;
      req.userGoogleKey = userGoogleKey;
      req.userCohereKey = userCohereKey;
      return next();
    }

    // User is using free tier - check quota
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('queries_used, pdfs_uploaded, max_queries, max_pdfs')
      .eq('google_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user quota:', error);
      return res.status(500).json({
        error: 'Failed to check quota',
        details: error.message,
      });
    }

    // Use custom limits or fallback to defaults
    const maxQueries = user.max_queries || FREE_TIER_LIMITS.MAX_QUERIES;
    const maxPdfs = user.max_pdfs || FREE_TIER_LIMITS.MAX_PDF_UPLOADS;

    // Check if quota exceeded
    if (user.queries_used >= maxQueries) {
      console.log(`❌ User ${userId} exceeded free quota: ${user.queries_used}/${maxQueries}`);
      return res.status(403).json({
        error: 'Free quota exceeded',
        message: 'Please add your own API keys to continue',
        queriesUsed: user.queries_used,
        maxQueries: maxQueries,
        pdfsUsed: user.pdfs_uploaded,
        maxPdfs: maxPdfs,
      });
    }

    // Increment query count for free tier users
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ queries_used: user.queries_used + 1 })
      .eq('google_id', userId);

    if (updateError) {
      console.error('Error updating query count:', updateError);
      // Don't block the request if update fails
    }

    console.log(`📊 User ${userId} query count: ${user.queries_used + 1}/${maxQueries}`);

    req.useUserKeys = false;
    req.currentQueries = user.queries_used + 1;
    req.maxQueries = maxQueries;
    next();
  } catch (err) {
    console.error('Quota middleware error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message,
    });
  }
}

/**
 * Middleware to check PDF upload quota
 */
export async function checkPdfQuota(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please sign in to upload PDFs',
      });
    }

    // Check if user has own keys
    const userGoogleKey = req.headers['x-user-google-key'];
    const userCohereKey = req.headers['x-user-cohere-key'];

    if (userGoogleKey && userCohereKey) {
      console.log(`✅ User ${userId} using own API keys - unlimited PDF uploads`);
      req.useUserKeys = true;
      req.userGoogleKey = userGoogleKey;
      req.userCohereKey = userCohereKey;
      return next();
    }

    // Check PDF upload quota for free tier
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('pdfs_uploaded, max_pdfs')
      .eq('google_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user PDF quota:', error);
      return res.status(500).json({
        error: 'Failed to check quota',
        details: error.message,
      });
    }

    // Use custom limit or fallback to default
    const maxPdfs = user.max_pdfs || FREE_TIER_LIMITS.MAX_PDF_UPLOADS;

    if (user.pdfs_uploaded >= maxPdfs) {
      console.log(`❌ User ${userId} exceeded PDF quota: ${user.pdfs_uploaded}/${maxPdfs}`);
      return res.status(403).json({
        error: 'PDF upload quota exceeded',
        message: 'Please add your own API keys to upload more PDFs',
        pdfsUsed: user.pdfs_uploaded,
        maxPdfs: maxPdfs,
      });
    }

    // Increment PDF count
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ pdfs_uploaded: user.pdfs_uploaded + 1 })
      .eq('google_id', userId);

    if (updateError) {
      console.error('Error updating PDF count:', updateError);
    }

    console.log(`📊 User ${userId} PDF uploads: ${user.pdfs_uploaded + 1}/${maxPdfs}`);

    req.useUserKeys = false;
    next();
  } catch (err) {
    console.error('PDF quota middleware error:', err);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message,
    });
  }
}
