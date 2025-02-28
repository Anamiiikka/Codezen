// frontend/src/components/CryptoDashboard/App.jsx
import { useState, useEffect, useContext } from "react";
import { CoinContext } from "../../context/CoinContext";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import Groq from "groq-sdk";
import styles from "../../style";

const CryptoDashboard = () => {
  const { allCoin, currency } = useContext(CoinContext);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const groqClient = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY, // Ensure this is set in your .env file
    dangerouslyAllowBrowser: true,
  });

  // Fetch historical data when a coin is selected
  const fetchHistoricalData = async (coinId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${currency.name}&days=30`,
        {
          headers: { "x-cg-demo-api-key": "CG-yDF1jqFeSyQ6SL3MbpeuPuMc" },
        }
      );
      const prices = response.data.prices.map(([timestamp, price]) => ({
        date: new Date(timestamp).toLocaleDateString(),
        price,
      }));
      setHistoricalData(prices);
    } catch (err) {
      console.error("Error fetching historical data:", err);
      setError("Failed to fetch historical data.");
      setHistoricalData([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle AI analysis generation
  const handleAiAnalysis = async () => {
    if (!selectedCoin || historicalData.length === 0) {
      setAiAnalysis("Please select a coin first!");
      return;
    }

    setLoading(true);
    setAiAnalysis("");

    const latestPrice = historicalData[historicalData.length - 1].price;
    const oneMonthAgoPrice = historicalData[0].price;
    const oneMonthGrowth = ((latestPrice - oneMonthAgoPrice) / oneMonthAgoPrice * 100).toFixed(2);
    const maxPrice = Math.max(...historicalData.map((d) => d.price));
    const minPrice = Math.min(...historicalData.map((d) => d.price));

    const summary = {
      coin_name: selectedCoin.name,
      symbol: selectedCoin.symbol,
      current_price: `${currency.Symbol}${latestPrice.toFixed(2)}`,
      one_month_growth: `${oneMonthGrowth}%`,
      highest_price_30d: `${currency.Symbol}${maxPrice.toFixed(2)}`,
      lowest_price_30d: `${currency.Symbol}${minPrice.toFixed(2)}`,
      market_cap: `${currency.Symbol}${selectedCoin.market_cap.toLocaleString()}`,
    };

    const prompt = `
      I have data about a cryptocurrency called '${summary.coin_name}' (${summary.symbol}). Please provide a simple, friendly explanation for someone new to crypto investing based on this data:
      - Name: ${summary.coin_name}
      - Symbol: ${summary.symbol}
      - Current Price: ${summary.current_price}
      - 1-Month Growth: ${summary.one_month_growth}
      - Highest Price (30 days): ${summary.highest_price_30d}
      - Lowest Price (30 days): ${summary.lowest_price_30d}
      - Market Cap: ${summary.market_cap}
      Explain in a conversational tone what this coin is, how it’s doing over the past month, and whether it might be a good fit for a beginner. Keep it short, avoid technical jargon, and make it feel like advice from a friend!
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
      setLoading(false);
    }
  };

  // Handle coin selection
  const handleSelectCoin = (coin) => {
    setSelectedCoin(coin);
    fetchHistoricalData(coin.id);
    setAiAnalysis(""); // Reset AI analysis when selecting a new coin
  };

  return (
    <div className={`bg-primary ${styles.paddingX} min-h-screen py-6`}>
      <div className="max-w-[1200px] mx-auto">
        <h2 className={styles.heading2}>Crypto Dashboard</h2>

        {/* Coin Selection */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-md">
          <select
            onChange={(e) => {
              const coin = allCoin.find((c) => c.id === e.target.value);
              handleSelectCoin(coin);
            }}
            className="w-full p-2 rounded bg-gray-900 text-white focus:outline-none border border-gray-700"
          >
            <option value="">Select a cryptocurrency...</option>
            {allCoin.map((coin) => (
              <option key={coin.id} value={coin.id}>
                {coin.name} ({coin.symbol.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* AI Analysis Button and Output */}
        {selectedCoin && (
          <div className="mb-6">
            <button
              onClick={handleAiAnalysis}
              disabled={loading}
              className={`py-2 px-4 rounded bg-blue-gradient text-primary font-poppins font-medium ${
                loading ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"
              }`}
            >
              {loading ? "Generating..." : "Get AI Analysis"}
            </button>
            {aiAnalysis && (
              <div className="bg-gray-800 rounded-lg p-4 mt-4 shadow-md text-white">
                <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
                <p className="text-sm">{aiAnalysis}</p>
              </div>
            )}
          </div>
        )}

        {/* Coin Details and Graph */}
        {loading ? (
          <p className="text-white text-center">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : selectedCoin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-4 shadow-md">
              <h3 className="text-white text-lg font-semibold mb-2">{selectedCoin.name}</h3>
              <p className="text-gray-300 text-sm">Symbol: {selectedCoin.symbol.toUpperCase()}</p>
              <p className="text-gray-300 text-sm">
                Current Price: {currency.Symbol}{selectedCoin.current_price.toLocaleString()}
              </p>
              <p className="text-gray-300 text-sm">
                Market Cap: {currency.Symbol}{selectedCoin.market_cap.toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 shadow-md">
              <h3 className="text-white text-lg font-semibold mb-2">30-Day Price History</h3>
              {historicalData.length > 0 ? (
                <LineChart width={500} height={300} data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="date" stroke="#fff" tick={{ fontSize: 10 }} interval="preserve_start_end" />
                  <YAxis stroke="#fff" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ backgroundColor: "#333", border: "none" }} />
                  <Line type="monotone" dataKey="price" stroke="#00f6ff" dot={false} strokeWidth={2} />
                </LineChart>
              ) : (
                <p className="text-gray-400">No historical data available</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-white text-center">Select a coin to view details and analysis</p>
        )}
      </div>
    </div>
  );
};

export default CryptoDashboard;