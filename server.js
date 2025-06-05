// server.js
import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config(); // Load .env variables

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

// Load API keys from .env (or fallback here)
const NEWS_API_KEY = process.env.NEWS_API_KEY || 'ea0950ffb10e4fdb8836aa3c022f1864';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCAb8_F8si1N9496ig2zdQx67JyWgMKLx0';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyBPHd2fpY64UEOGuX1q6FWWnS6k7DBokCo';

// --- Helper: sanitize text for AI prompts
function sanitizeText(text) {
  return text ? text.replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

// --- Gemini summarizer
async function summarizeWithGemini(article) {
  const title = sanitizeText(article.title);
  const description = sanitizeText(article.description);
  const prompt = `Summarize this news article in one concise sentence:\n\nTitle: ${title}\n\nDescription: ${description}`;

  if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 20) {
    console.error("⚠️ Gemini API Key missing or invalid.");
    return 'AI Error: Gemini API key missing or invalid.';
  }

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const aiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
    });
    const aiData = await aiRes.json();

    if (aiRes.status !== 200 || aiData.error) {
      console.error("⚠️ Gemini AI Error:", aiData.error?.message || aiData);
      return 'AI Error: ' + (aiData.error?.message || 'Unknown Gemini API error.');
    }

    const summary = aiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return summary || 'No summary available from AI.';
  } catch (error) {
    console.error('❌ Gemini summarization failed:', error);
    return 'Failed to summarize due to internal server error.';
  }
}

// --- News endpoint
app.get('/news', async (req, res) => {
  const query = req.query.query;
  const category = req.query.category || 'general';

  if (!NEWS_API_KEY || NEWS_API_KEY.length < 20) {
    console.error("⚠️ NewsAPI Key missing or invalid.");
    return res.status(500).json({ error: 'NewsAPI key missing or invalid.' });
  }

  let newsApiUrl;
  if (query) {
    newsApiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=relevancy&apiKey=${NEWS_API_KEY}`;
  } else {
    newsApiUrl = `https://newsapi.org/v2/top-headlines?country=us&category=${encodeURIComponent(category)}&apiKey=${NEWS_API_KEY}`;
  }

  try {
    const newsRes = await fetch(newsApiUrl);
    const newsData = await newsRes.json();

    if (!newsRes.ok || newsData.status !== 'ok') {
      console.error('❌ NewsAPI Error:', newsData.message || 'Unknown NewsAPI error');
      return res.status(newsRes.status).json({ error: newsData.message || 'Failed to fetch news.' });
    }

    if (!newsData.articles || newsData.articles.length === 0) {
      return res.status(404).json({ error: 'No articles found.' });
    }

    const articlesToSummarize = newsData.articles.filter(a => a.title && a.description).slice(0, 5);

    const summarizedArticles = await Promise.all(
      articlesToSummarize.map(async (article) => {
        const summary = await summarizeWithGemini(article);
        return {
          title: sanitizeText(article.title),
          url: article.url,
          summary,
          urlToImage: article.urlToImage,
        };
      })
    );

    res.json({ articles: summarizedArticles });

  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error while processing news.' });
  }
});

// --- Videos endpoint
app.get('/videos', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query parameter "q"' });

  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY.length < 20) {
    console.error("⚠️ YouTube API Key missing or invalid.");
    return res.status(500).json({ error: 'YouTube API key missing or invalid.' });
  }

  const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/search?` + new URLSearchParams({
    part: 'snippet',
    maxResults: '4',
    q: query,
    type: 'video',
    key: YOUTUBE_API_KEY,
  });

  try {
    const response = await fetch(youtubeApiUrl);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      return res.status(500).json({ error: 'YouTube API error', details: data.error });
    }

    const videos = data.items.map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle,
    }));

    res.json({ videos });

  } catch (error) {
    console.error('Failed to fetch YouTube videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});