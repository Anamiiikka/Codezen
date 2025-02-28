import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../../style";
import { useAuth0 } from "@auth0/auth0-react";
import Groq from "groq-sdk";

const Portfolio = () => {
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const groqClient = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!isAuthenticated || !user) {
        setError("Please log in to view your portfolio.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/get-portfolio/${user.sub}`);
        setPortfolioItems(response.data);
      } catch (err) {
        console.error("Error fetching portfolio:", err);
        setError("Failed to fetch your portfolio. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, [isAuthenticated, user]);

  const handleRemoveItem = async (itemId) => {
    if (!isAuthenticated || !user) {
      alert("Please log in to remove items.");
      return;
    }
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/remove-from-portfolio/${user.sub}/${itemId}`);
      setPortfolioItems(portfolioItems.filter((item) => item.item_id !== itemId));
      alert("Item removed successfully!");
    } catch (err) {
      console.error("Error removing item:", err);
      alert(err.response?.data?.detail || "Failed to remove item.");
    }
  };

  const handleAiAnalysis = async () => {
    if (!isAuthenticated || !user || portfolioItems.length === 0) {
      setAiAnalysis("Please add items to your portfolio to get an AI analysis!");
      return;
    }

    setAnalysisLoading(true);
    setAiAnalysis("");

    const portfolioSummary = portfolioItems.map((item) => ({
      name: item.name,
      type: item.item_type,
      added_at: item.added_at,
    }));

    const prompt = `
      I have a portfolio with the following items: ${JSON.stringify(portfolioSummary, null, 2)}.
      Please provide a simple, friendly analysis for someone new to investing. Analyze the mix of mutual funds and cryptocurrencies, suggest how diversified it is, and offer basic insights on potential risks or benefits. Keep it conversational, short, and easy to understand!
    `;

    try {
      const chatCompletion = await groqClient.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 1,
        max_completion_tokens: 1024,
        top_p: 1,
        stream: true,
        stop: null,
      });

      let analysis = "";
      for await (const chunk of chatCompletion) {
        analysis += chunk.choices[0]?.delta?.content || "";
        setAiAnalysis(analysis);
      }
    } catch (err) {
      console.error("Error generating AI analysis:", err);
      setAiAnalysis("Oops, something went wrong while generating the analysis!");
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (!isAuthenticated) {
    loginWithRedirect();
    return null;
  }

  return (
    <div className={`bg-primary ${styles.paddingX} min-h-screen py-6`}>
      <div className="max-w-[1200px] mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-6 shadow-md">
          <h1 className="text-white text-3xl font-semibold mb-2">
            Welcome, {user?.name || "User"}!
          </h1>
          <p className="text-gray-400 text-lg mb-4">
            Here’s everything you’ve added to your portfolio:
          </p>
          <button
            onClick={handleAiAnalysis}
            disabled={analysisLoading || portfolioItems.length === 0}
            className={`py-2 px-4 rounded bg-blue-gradient text-primary font-poppins font-medium ${
              analysisLoading || portfolioItems.length === 0
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-secondary"
            }`}
          >
            {analysisLoading ? "Generating..." : "Get AI Analysis"}
          </button>
        </div>

        {aiAnalysis && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-md text-white">
            <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
            <p className="text-sm">{aiAnalysis}</p>
          </div>
        )}

        {loading ? (
          <p className="text-white text-center">Loading your portfolio...</p>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : portfolioItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolioItems.map((item, index) => (
              <div
                key={index}
                className="bg-gray-700 rounded-lg p-4 shadow-md flex flex-col"
              >
                <h3 className="text-white text-lg font-semibold mb-2">{item.name}</h3>
                <p className="text-gray-300 text-sm">Type: {item.item_type}</p>
                <p className="text-gray-300 text-sm">
                  Added: {new Date(item.added_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => handleRemoveItem(item.item_id)}
                  className="mt-2 py-1 px-3 bg-red-600 text-white rounded font-poppins text-sm hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center">
            Your portfolio is empty. Add some funds or coins from the dashboards!
          </p>
        )}
      </div>
    </div>
  );
};

export default Portfolio;