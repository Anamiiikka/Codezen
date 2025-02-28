import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import Plotly from "react-plotly.js";
import styles from "../../style";
import { CoinContext } from "../../context/CoinContext";
import Chatbot from "../Chatbot";
import Groq from "groq-sdk";
import { useAuth0 } from "@auth0/auth0-react";
import { motion } from "framer-motion"; // Added for animation

// Custom Components (unchanged, omitted for brevity)
const RiskVolatility = ({ selectedCoin }) => {
  // ... (unchanged)
};

const MonteCarloPrediction = ({ selectedCoin }) => {
  // ... (unchanged)
};

const CalculateReturns = ({ selectedCoin, historicalPrice }) => {
  // ... (unchanged)
};

const CryptoDashboard = () => {
  const { allCoin, currency } = useContext(CoinContext);
  const { user, isAuthenticated } = useAuth0();
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [randomCoins, setRandomCoins] = useState([]);
  const [coinDetails, setCoinDetails] = useState({});
  const [historicalPrice, setHistoricalPrice] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [priceRange, setPriceRange] = useState("365"); // Default to 1 year

  const groqClient = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  // Fetch random coins on initial load (unchanged)
  useEffect(() => {
    if (allCoin.length > 0) {
      const shuffled = [...allCoin].sort(() => 0.5 - Math.random());
      setRandomCoins(shuffled.slice(0, 5));
    }
  }, [allCoin]);

  // Fetch suggestions based on search term (unchanged)
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }
    const filtered = allCoin.filter(coin => coin.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
    setSuggestions(filtered);
  }, [searchTerm, allCoin]);

  // Fetch coin details and historical price (unchanged)
  useEffect(() => {
    const fetchCoinDetails = async () => {
      if (!selectedCoin) {
        setCoinDetails({});
        setHistoricalPrice([]);
        setHeatmapData([]);
        setAiAnalysis("");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const detailsResponse = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${selectedCoin.id}`,
          { headers: { "x-cg-demo-api-key": "CG-yDF1jqFeSyQ6SL3MbpeuPuMc" } }
        );
        setCoinDetails(detailsResponse.data);

        const priceResponse = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${selectedCoin.id}/market_chart?vs_currency=usd&days=${priceRange}&interval=daily`,
          { headers: { "x-cg-demo-api-key": "CG-yDF1jqFeSyQ6SL3MbpeuPuMc" } }
        );
        const prices = priceResponse.data.prices.map(([timestamp, price]) => ({
          date: new Date(timestamp).toISOString().split("T")[0],
          nav: price,
        }));
        setHistoricalPrice(prices);

        const monthlyReturns = prices.slice(1).reduce((acc, curr, i) => {
          const month = new Date(curr.date).getMonth() + 1;
          const dailyChange = (curr.nav - prices[i].nav) / prices[i].nav;
          acc[month] = acc[month] ? (acc[month] + dailyChange) / 2 : dailyChange;
          return acc;
        }, {});
        setHeatmapData(Object.entries(monthlyReturns).map(([month, dayChange]) => ({ month, dayChange })));
      } catch (err) {
        console.error("Error fetching coin details:", err);
        setError("Failed to fetch coin details.");
      } finally {
        setLoading(false);
      }
    };
    fetchCoinDetails();
  }, [selectedCoin, priceRange]);

  const handleSearchChange = (e) => {
    e.preventDefault();
    setSearchTerm(e.target.value);
    setSelectedCoin(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") e.preventDefault();
  };

  const handleSelectCoin = (coin) => {
    setSelectedCoin(coin);
    setSearchTerm(coin.name);
    setSuggestions([]);
  };

  const addToPortfolio = async (coin) => {
    if (!isAuthenticated || !user) {
      alert("Please log in to add items to your portfolio!");
      return;
    }
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/add-to-portfolio`,
        {
          user_id: user.sub,
          item_type: "crypto",
          item_id: coin.id,
          name: coin.name,
        }
      );
      alert(response.data.message);
    } catch (err) {
      console.error("Error adding to portfolio:", err);
      alert(err.response?.data?.detail || "Failed to add to portfolio");
    }
  };

  const handleAiAnalysis = async () => {
    if (!selectedCoin || Object.keys(coinDetails).length === 0) {
      setAiAnalysis("Please select a coin first!");
      return;
    }

    setLoading(true);
    setAiAnalysis("");

    const latestPrice = historicalPrice.length > 0 ? historicalPrice[historicalPrice.length - 1].nav : 0;
    const oneYearAgoPrice = historicalPrice.length > 252 ? historicalPrice[historicalPrice.length - 252].nav : latestPrice;
    const oneYearGrowth = oneYearAgoPrice > 0 ? ((latestPrice - oneYearAgoPrice) / oneYearAgoPrice * 100).toFixed(1) : "N/A";
    const bestMonth = heatmapData.length > 0 ? heatmapData.reduce((max, curr) => max.dayChange > curr.dayChange ? max : curr) : { month: "N/A", dayChange: 0 };
    const worstMonth = heatmapData.length > 0 ? heatmapData.reduce((min, curr) => min.dayChange < curr.dayChange ? min : curr) : { month: "N/A", dayChange: 0 };

    const summary = {
      coin_name: selectedCoin.name,
      launched: coinDetails.genesis_date || "N/A",
      latest_price: latestPrice,
      one_year_growth: oneYearGrowth,
      best_month: bestMonth.month ? `${bestMonth.month} (+${(bestMonth.dayChange * 100).toFixed(2)}%)` : "N/A",
      worst_month: worstMonth.month ? `${worstMonth.month} (${(worstMonth.dayChange * 100).toFixed(2)}%)` : "N/A",
    };

    const prompt = `
      I have data about a cryptocurrency called '${summary.coin_name}'. Please provide a simple, friendly explanation for someone new to investing:
      - Coin Name: ${summary.coin_name}
      - Launched: ${summary.launched}
      - Latest Price: $${summary.latest_price.toFixed(2)}
      - 1-Year Growth: ${summary.one_year_growth}%
      - Best Month: ${summary.best_month}
      - Worst Month: ${summary.worst_month}
      Explain in a conversational tone what this coin is, how it’s doing, and whether it might be a good fit for a beginner. Keep it short and simple!
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
      setAiAnalysis("Oops, something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (days) => {
    setPriceRange(days);
  };

  const filteredPriceData = historicalPrice;

  const plotData = heatmapData.length > 0 ? [{
    x: heatmapData.map(d => d.month),
    y: heatmapData.map(d => d.dayChange),
    z: heatmapData.map(d => d.dayChange),
    type: "heatmap",
    colorscale: "Viridis",
  }] : [];

  const randomCoinsSection = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {randomCoins.map((coin) => (
        <div
          key={coin.id}
          className="bg-gray-800 rounded-lg p-4 shadow-md hover:bg-gray-700 transition-colors"
        >
          <h3 className="text-white text-md font-semibold mb-2">{coin.name}</h3>
          <p className="text-gray-400 text-sm">Symbol: {coin.symbol.toUpperCase()}</p>
          <p className="text-gray-400 text-sm">Price: {currency.Symbol}{coin.current_price.toLocaleString()}</p>
          <div className="flex justify-between mt-2">
            <button
              onClick={() => handleSelectCoin(coin)}
              className="py-1 px-3 bg-blue-gradient text-primary rounded font-poppins text-sm"
            >
              View Details
            </button>
            <button
              onClick={() => addToPortfolio(coin)}
              className="py-1 px-3 bg-green-600 text-white rounded font-poppins text-sm hover:bg-green-700"
            >
              Add to Portfolio
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const selectedCoinSection = selectedCoin && (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gray-800 rounded-lg p-4 shadow-md">
        <h3 className="text-white text-lg font-semibold mb-2">{selectedCoin.name}</h3>
        <div className="text-gray-300 text-sm">
          <p><span className="font-medium">Symbol:</span> {coinDetails.symbol?.toUpperCase()}</p>
          <p><span className="font-medium">Market Cap:</span> ${coinDetails.market_cap?.usd?.toLocaleString()}</p>
          <p><span className="font-medium">Current Price:</span> ${coinDetails.market_data?.current_price?.usd?.toFixed(2)}</p>
          <p><span className="font-medium">Launch Date:</span> {coinDetails.genesis_date || "N/A"}</p>
          <p><span className="font-medium">Volume (24h):</span> ${coinDetails.market_data?.total_volume?.usd?.toLocaleString()}</p>
        </div>
        <button
          onClick={() => addToPortfolio(selectedCoin)}
          className="mt-4 py-1 px-3 bg-green-600 text-white rounded font-poppins text-sm hover:bg-green-700"
        >
          Add to Portfolio
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 shadow-md flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-white text-lg font-semibold">Historical Price</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleRangeChange("30")}
              className={`py-1 px-2 rounded text-white ${priceRange === "30" ? "bg-blue-gradient" : "bg-gray-700"} hover:bg-secondary`}
            >
              1M
            </button>
            <button
              onClick={() => handleRangeChange("90")}
              className={`py-1 px-2 rounded text-white ${priceRange === "90" ? "bg-blue-gradient" : "bg-gray-700"} hover:bg-secondary`}
            >
              3M
            </button>
            <button
              onClick={() => handleRangeChange("180")}
              className={`py-1 px-2 rounded text-white ${priceRange === "180" ? "bg-blue-gradient" : "bg-gray-700"} hover:bg-secondary`}
            >
              6M
            </button>
            <button
              onClick={() => handleRangeChange("365")}
              className={`py-1 px-2 rounded text-white ${priceRange === "365" ? "bg-blue-gradient" : "bg-gray-700"} hover:bg-secondary`}
            >
              1Y
            </button>
          </div>
        </div>
        {filteredPriceData.length > 0 ? (
          <LineChart width={350} height={200} data={filteredPriceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="date" stroke="#fff" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickCount={6} />
            <YAxis stroke="#fff" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ backgroundColor: "#333", border: "none" }} />
            <Line type="monotone" dataKey="nav" stroke="#00f6ff" dot={false} strokeWidth={2} />
          </LineChart>
        ) : (
          <p className="text-gray-400">No price data</p>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-4 shadow-md">
        <CalculateReturns selectedCoin={selectedCoin} historicalPrice={historicalPrice} />
      </div>

      <div className="bg-gray-800 rounded-lg p-4 shadow-md">
        <h3 className="text-white text-lg font-semibold mb-2">Performance Heatmap</h3>
        {heatmapData.length > 0 ? (
          <Plotly
            data={plotData}
            layout={{
              xaxis: { title: "Month", color: "#fff", tickfont: { size: 10 } },
              yaxis: { title: "Day Change", color: "#fff", tickfont: { size: 10 } },
              width: 350,
              height: 200,
              margin: { t: 20, b: 40, l: 40, r: 20 },
            }}
            config={{ displayModeBar: false }}
          />
        ) : (
          <p className="text-gray-400">No heatmap data</p>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-4 shadow-md">
        <RiskVolatility selectedCoin={selectedCoin} />
      </div>

      <div className="bg-gray-800 rounded-lg p-4 shadow-md">
        <MonteCarloPrediction selectedCoin={selectedCoin} />
      </div>
    </div>
  );

  return (
    <div className={`bg-primary ${styles.paddingX} min-h-screen py-6`}>
      <div className="max-w-[1200px] mx-auto">
        {/* Added Heading */}
        <motion.h1
          className={`${styles.heading2} text-center text-gradient mb-6`}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Cryptocurrency Dashboard
        </motion.h1>
        <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-md relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="w-full p-2 rounded bg-gray-900 text-white focus:outline-none border border-gray-700"
            placeholder="Search for a cryptocurrency..."
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 bg-gray-800 text-white rounded-lg w-[300px] max-h-60 overflow-y-auto mt-2 shadow-lg">
              {suggestions.map((coin) => (
                <li
                  key={coin.id}
                  onClick={() => handleSelectCoin(coin)}
                  className="p-2 hover:bg-gray-700 cursor-pointer"
                >
                  {coin.name}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={handleAiAnalysis}
            disabled={loading || !selectedCoin}
            className={`mt-4 py-2 px-4 rounded bg-blue-gradient text-primary font-poppins font-medium ${loading || !selectedCoin ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"}`}
          >
            {loading ? "Generating..." : "AI DOST"}
          </button>
        </div>

        {aiAnalysis && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-md text-white">
            <h3 className="text-lg font-semibold mb-2">AI Dost</h3>
            <p className="text-sm">{aiAnalysis}</p>
          </div>
        )}

        {loading && !aiAnalysis ? (
          <p className="text-white text-center">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : selectedCoin ? (
          selectedCoinSection
        ) : (
          randomCoinsSection
        )}
      </div>
      <Chatbot selectedFund={selectedCoin} />
    </div>
  );
};

export default CryptoDashboard;