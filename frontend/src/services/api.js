const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function notifyUnauthorized(token) {
  if (token && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jobbot:unauthorized'));
  }
}

async function apiRequest(path, { method = 'GET', token, body, isFormData = false } = {}) {
  const headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body && !isFormData ? JSON.stringify(body) : body,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      notifyUnauthorized(token);
    }
    const detail = typeof payload === 'object' && payload ? payload.detail || payload.message : payload;
    throw new Error(typeof detail === 'string' ? detail : 'Request failed');
  }

  return payload;
}

export function loginUser({ email, password }) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function registerUser({ name, email, password, phone, location }) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: { name, email, password, phone, location },
  });
}

export function searchJobs({ query, location, token }) {
  const params = new URLSearchParams({ query });
  if (location) params.set('location', location);
  return apiRequest(`/api/jobs/search?${params.toString()}`, {
    method: 'POST',
    token,
  });
}

export function searchSocialPosts({
  query,
  location,
  platforms,
  minMatchScore,
  classifications,
  sourceTypes,
  employmentType,
  workMode,
  includeNonJobs,
  token,
}) {
  return apiRequest('/api/social-posts/search', {
    method: 'POST',
    token,
    body: {
      query,
      location,
      platforms,
      min_match_score: minMatchScore,
      classifications,
      source_types: sourceTypes,
      employment_type: employmentType,
      work_mode: workMode,
      include_non_jobs: includeNonJobs,
    },
  });
}

export function listSocialPosts({ query, minMatchScore, token }) {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (minMatchScore) params.set('min_match_score', minMatchScore);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/social-posts${suffix}`, { token });
}

export function importSocialPost({ postText, originalPostUrl, platform, authorName, publicationDate, token }) {
  return apiRequest('/api/social-posts/import-url', {
    method: 'POST',
    token,
    body: {
      post_text: postText,
      original_post_url: originalPostUrl,
      platform,
      author_name: authorName,
      publication_date: publicationDate,
    },
  });
}

export function classifySocialPost({ postText, originalPostUrl, platform, authorName, token }) {
  return apiRequest('/api/social-posts/classify', {
    method: 'POST',
    token,
    body: {
      post_text: postText,
      original_post_url: originalPostUrl,
      platform,
      author_name: authorName,
    },
  });
}

export function matchSocialPost({ postId, token }) {
  return apiRequest(`/api/social-posts/${postId}/match-resume`, {
    method: 'POST',
    token,
  });
}

export function saveSocialPost({ postId, token }) {
  return apiRequest(`/api/social-posts/${postId}/save`, {
    method: 'POST',
    token,
  });
}

export function sendSocialPostFeedback({ postId, feedback, token }) {
  return apiRequest(`/api/social-posts/${postId}/feedback`, {
    method: 'POST',
    token,
    body: { feedback },
  });
}

export function generateSocialPostCoverLetter({ postId, token }) {
  return apiRequest(`/api/social-posts/${postId}/cover-letter`, {
    method: 'POST',
    token,
  });
}

export function listResumes(token) {
  return apiRequest('/api/resumes', { token });
}

export function uploadResume({ file, token }) {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${API_BASE_URL}/api/resumes/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  }).then(async (response) => {
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      if (response.status === 401) {
        notifyUnauthorized(token);
      }
      const detail = typeof payload === 'object' && payload ? payload.detail || payload.message : payload;
      throw new Error(typeof detail === 'string' ? detail : 'Resume upload failed');
    }

    return payload;
  });
}

export function analyzeResume({ resumeId, token }) {
  return apiRequest(`/api/ats/analyze/${resumeId}`, {
    method: 'POST',
    token,
  });
}

export function deleteResume({ resumeId, token }) {
  return apiRequest(`/api/resumes/${resumeId}`, {
    method: 'DELETE',
    token,
  });
}

export function getAnalytics(token) {
  return apiRequest('/api/analytics', { token });
}

export function analyzeJobDescription({ jobDescription, token }) {
  return apiRequest('/api/jobs/analyze-description', {
    method: 'POST',
    token,
    body: { job_description: jobDescription },
  });
}

export function matchJob({ jobId, token }) {
  return apiRequest(`/api/jobs/${jobId}/match`, {
    method: 'POST',
    token,
  });
}

export function generateCoverLetter({ jobId, token }) {
  return apiRequest(`/api/jobs/${jobId}/cover-letter`, {
    method: 'POST',
    token,
  });
}

export function saveJob({ jobId, token }) {
  return apiRequest(`/api/jobs/${jobId}/save`, {
    method: 'POST',
    token,
  });
}

export function listSavedJobs(token) {
  return apiRequest('/api/jobs/saved', { token });
}

export function removeSavedJob({ jobId, token }) {
  return apiRequest(`/api/jobs/${jobId}/save`, {
    method: 'DELETE',
    token,
  });
}

export function createApplication({ jobId, token }) {
  return apiRequest('/api/applications', {
    method: 'POST',
    token,
    body: { job_id: jobId },
  });
}

export function listApplications(token) {
  return apiRequest('/api/applications', { token });
}

export function startApplication({ applicationId, token }) {
  return apiRequest(`/api/applications/${applicationId}/start`, {
    method: 'POST',
    token,
  });
}

export function reviewApplication({ applicationId, token }) {
  return apiRequest(`/api/applications/${applicationId}/review`, {
    method: 'POST',
    token,
  });
}

export function submitApplication({ applicationId, token }) {
  return apiRequest(`/api/applications/${applicationId}/submit`, {
    method: 'POST',
    token,
  });
}
