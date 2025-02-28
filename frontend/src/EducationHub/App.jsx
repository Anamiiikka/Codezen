// frontend/src/EducationHub/App.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./App.css";

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY;

const initialVideos = [
  { title: "Stock Market for Beginners", videoId: "p7HKvqRI_Bo" },
  { title: "How to Invest in ETFs", videoId: "pT7tW4miW0w" },
  { title: "Mutual Funds Explained", videoId: "R8u8oL2l-aM" },
  { title: "Cryptocurrency Investing", videoId: "iS2-SfolkJc" },
  { title: "Understanding Bonds", videoId: "IoV_ggmQ4nk" },
  { title: "Ethereum and Smart Contracts", videoId: "pWGLtjG-F5c" },
];

const trendingNews = [
  {
    title: "Tech Stocks Surge in 2025",
    summary: "Analysts predict a boom in tech investments.",
    url: "https://www.google.com/search?q=tech+stocks+surge+2025",
  },
  {
    title: "Crypto Market Volatility Continues",
    summary: "Bitcoin and Ethereum face fluctuations.",
    url: "https://www.google.com/search?q=crypto+market+volatility+2025",
  },
  {
    title: "Federal Reserve Rate Cut Impact",
    summary: "How lower rates affect markets in 2025.",
    url: "https://www.google.com/search?q=federal+reserve+rate+cut+2025",
  },
  {
    title: "Emerging Markets Gain Momentum",
    summary: "Investment trends in developing economies.",
    url: "https://www.google.com/search?q=emerging+markets+2025",
  },
];

const EducationHub = () => {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState(initialVideos);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blogQuery, setBlogQuery] = useState("");
  const [blogs, setBlogs] = useState([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [blogError, setBlogError] = useState("");

  const fetchVideos = async () => {
    if (!query) {
      setError("Please enter a search term.");
      return;
    }
    if (!YOUTUBE_API_KEY) {
      setError("Invalid or missing YouTube API key.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query
      )}&type=video&maxResults=6&key=${YOUTUBE_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      if (!data.items || data.items.length === 0) throw new Error("No videos found.");
      setVideos(
        data.items.map((item) => ({
          title: item.snippet.title,
          videoId: item.id.videoId,
        }))
      );
    } catch (err) {
      setError(`Failed to fetch videos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogs = async () => {
    if (!NEWS_API_KEY) {
      setBlogError("Missing News API key.");
      return;
    }
    setBlogLoading(true);
    setBlogError("");
    try {
      const searchTerm = blogQuery || "finance investment";
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        searchTerm
      )}&language=en&sortBy=relevancy&apiKey=${NEWS_API_KEY}&pageSize=6`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      if (!data.articles || data.articles.length === 0) throw new Error("No articles found.");
      setBlogs(
        data.articles.map((article) => ({
          title: article.title,
          description: article.description || "No description available",
          url: article.url,
        }))
      );
    } catch (err) {
      setBlogError(`Failed to fetch blogs: ${err.message}`);
      setBlogs([]);
    } finally {
      setBlogLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleBlogSearch = () => {
    fetchBlogs();
  };

  return (
    <div className="app-container">
      <motion.h1
        className="heading"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Financial Education Hub
      </motion.h1>

      <motion.div
        className="search-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search financial videos..."
          className="search-input"
        />
        <motion.button
          onClick={fetchVideos}
          className="search-button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Search
        </motion.button>
      </motion.div>

      {loading && <p className="loading text-white">Loading videos...</p>}
      {error && <p className="error text-white">{error}</p>}

      <motion.div
        className="video-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        {videos.map((video, index) => (
          <motion.div
            key={index}
            className="video-card"
            whileHover={{ scale: 1.05 }}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <h3 className="video-title">{video.title}</h3>
            <iframe
              width="100%"
              height="180"
              src={`https://www.youtube.com/embed/${video.videoId}`}
              frameBorder="0"
              allowFullScreen
              title={video.title}
            />
          </motion.div>
        ))}
      </motion.div>

      <motion.h2
        className="section-heading blogs-heading"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        Financial Blogs
      </motion.h2>

      <motion.div
        className="search-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
      >
        <input
          type="text"
          value={blogQuery}
          onChange={(e) => setBlogQuery(e.target.value)}
          placeholder="Search financial blog topics..."
          className="search-input"
        />
        <motion.button
          onClick={handleBlogSearch}
          className="search-button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Search
        </motion.button>
      </motion.div>

      {blogLoading && <p className="loading text-white">Loading blogs...</p>}
      {blogError && <p className="error text-white">{blogError}</p>}

      <motion.div
        className="blog-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
      >
        {blogs.length > 0 ? (
          blogs.map((blog, index) => (
            <motion.div
              key={index}
              className="blog-card"
              whileHover={{ scale: 1.05 }}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.8 + index * 0.2, duration: 0.5 }}
            >
              <h3 className="blog-title">{blog.title}</h3>
              <p className="blog-description">{blog.description}</p>
              <a href={blog.url} target="_blank" rel="noopener noreferrer" className="read-more-button">
                Read More
              </a>
            </motion.div>
          ))
        ) : (
          !blogLoading && <p className="text-white">No blogs found.</p>
        )}
      </motion.div>

      <motion.h2
        className="section-heading news-heading"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.8 }}
      >
        Trending Financial News
      </motion.h2>

      <motion.div
        className="news-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 0.8 }}
      >
        {trendingNews.map((news, index) => (
          <motion.div
            key={index}
            className="news-card"
            whileHover={{ scale: 1.05 }}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 2.5 + index * 0.2, duration: 0.5 }}
          >
            <h3 className="news-title">{news.title}</h3>
            <p className="news-summary">{news.summary}</p>
            <a href={news.url} target="_blank" rel="noopener noreferrer" className="news-link">
              Read More on Google
            </a>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default EducationHub;