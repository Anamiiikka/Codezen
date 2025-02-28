// frontend/src/components/CryptoDashboard/App.jsx
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import Plotly from "react-plotly.js";
import styles from "../../style";
import { CoinContext } from "../../context/CoinContext";
import Chatbot from "../Chatbot";
import Groq from "groq-sdk";

// Custom Components
const RiskVolatility = ({ selectedCoin }) => {
  const [metrics, setMetrics] = useState({});
  const [returnsData, setReturnsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      if (!selectedCoin) {
        setMetrics({});
        setReturnsData([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${selectedCoin.id}/market_chart?vs_currency=usd&days=365&interval=daily`,
          { headers: { "x-cg-demo-api-key": "CG-yDF1jqFeSyQ6SL3MbpeuPuMc" } }
        );
        const prices = response.data.prices.map(([timestamp, price]) => ({
          date: new Date(timestamp).toISOString().split("T")[0],
          price,
        }));
        const returns = prices.slice(1).map((curr, i) => ({
          date: curr.date,
          returns: (curr.price / prices[i].price) - 1,
          nav: curr.price,
        }));

        const annualizedVolatility = (returns.reduce((sum, r) => sum + r.returns, 0) / returns.length) * Math.sqrt(252);
        const annualizedReturn = (returns[returns.length - 1].nav / returns[0].nav) ** (252 / returns.length) - 1;
        const sharpeRatio = (annualizedReturn - 0.02) / annualizedVolatility;

        setMetrics({ annualizedVolatility, annualizedReturn, sharpeRatio });
        setReturnsData(returns);
      } catch (err) {
        console.error("Error fetching crypto risk data:", err);
        setError("Failed to fetch risk data.");
      } finally {
        setLoading(false);
      }
    };
    fetchPriceHistory();
  }, [selectedCoin]);

  return (
    <div className="flex flex-col">
      <h3 className="text-white text-lg font-semibold mb-2">Risk & Volatility</h3>
      {loading ? <p className="text-gray-400">Loading...</p> : error ? <p className="text-red-500">{error}</p> : (
        <>
          <div className="text-gray-300 text-sm mb-4">
            <p><span className="font-medium">Annualized Volatility:</span> {(metrics.annualizedVolatility * 100).toFixed(2)}%</p>
            <p><span className="font-medium">Annualized Return:</span> {(metrics.annualizedReturn * 100).toFixed(2)}%</p>
            <p><span className="font-medium">Sharpe Ratio:</span> {metrics.sharpeRatio?.toFixed(2)}</p>
          </div>
          <LineChart width={350} height={200} data={returnsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="date" stroke="#fff" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickCount={6} />
            <YAxis stroke="#fff" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ backgroundColor: "#333", border: "none" }} />
            <Line type="monotone" dataKey="returns" stroke="#00f6ff" dot={false} strokeWidth={2} />
          </LineChart>
        </>
      )}
    </div>
  );
};

const MonteCarloPrediction = ({ selectedCoin }) => {
  const [monteCarloData, setMonteCarloData] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const SIMULATIONS = 100;
  const DAYS_AHEAD = 252;

  useEffect(() => {
    const fetchDataAndSimulate = async () => {
      if (!selectedCoin) {
        setMonteCarloData([]);
        setHistoricalData([]);
        return;
      }
      setLoading(true);
      try {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${selectedCoin.id}/market_chart?vs_currency=usd&days=365&interval=daily`,
          { headers: { "x-cg-demo-api-key": "CG-yDF1jqFeSyQ6SL3MbpeuPuMc" } }
        );
        const historical = response.data.prices.map(([timestamp, price]) => ({
          date: new Date(timestamp).toISOString().split("T")[0],
          nav: price,
        }));
        setHistoricalData(historical);

        const returns = historical.slice(1).map((curr, i) => (curr.nav / historical[i].nav) - 1);
        const dailyReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const dailyVolatility = Math.sqrt(returns.reduce((sum, r) => sum + (r - dailyReturn) ** 2, 0) / (returns.length - 1));
        const simulatedPaths = runMonteCarloSimulation(dailyReturn, dailyVolatility, historical);
        setMonteCarloData(simulatedPaths);
      } catch (err) {
        console.error("Error fetching Monte Carlo data:", err);
        setError("Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };
    fetchDataAndSimulate();
  }, [selectedCoin]);

  const runMonteCarloSimulation = (dailyReturn, dailyVolatility, historical) => {
    const lastEntry = historical[historical.length - 1];
    const simulations = [];
    for (let i = 0; i < SIMULATIONS; i++) {
      const path = [{ date: lastEntry.date, nav: lastEntry.nav }];
      let currentNav = lastEntry.nav;
      for (let j = 1; j <= DAYS_AHEAD; j++) {
        const randomReturn = dailyReturn + dailyVolatility * (Math.random() * 2 - 1);
        currentNav *= (1 + randomReturn);
        const previousDate = new Date(path[j - 1].date);
        previousDate.setDate(previousDate.getDate() + 1);
        path.push({ date: previousDate.toISOString().split("T")[0], nav: currentNav });
      }
      simulations.push(path);
    }
    return simulations;
  };

  const combinedData = historicalData.concat(monteCarloData.length > 0 ? monteCarloData[0] : []);

  return (
    <div className="flex flex-col">
      <h3 className="text-white text-lg font-semibold mb-2">Monte Carlo Prediction (1 Year)</h3>
      {loading ? <p className="text-gray-400">Loading...</p> : error ? <p className="text-red-500">{error}</p> : (
        <LineChart width={350} height={200} data={combinedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="date" stroke="#fff" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickCount={6} />
          <YAxis stroke="#fff" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ backgroundColor: "#333", border: "none" }} />
          <Line type="monotone" dataKey="nav" stroke="#8884d8" name="Historical + Predicted" dot={false} strokeWidth={2} />
          {monteCarloData.slice(1, 5).map((path, index) => (
            <Line key={index} type="monotone" dataKey="nav" data={path} stroke="#82ca9d" name={`Simulation ${index + 1}`} dot={false} strokeOpacity={0.3} strokeWidth={2} />
          ))}
        </LineChart>
      )}
    </div>
  );
};

const CalculateReturns = ({ selectedCoin, historicalPrice }) => {
  const [years, setYears] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);

  const calculateReturns = () => {
    if (!selectedCoin || !historicalPrice.length || !years || !amount) {
      setResult(null);
      return;
    }

    const investmentAmount = parseFloat(amount);
    const investmentYears = parseFloat(years);

    if (isNaN(investmentAmount) || isNaN(investmentYears) || investmentYears <= 0 || investmentAmount <= 0) {
      setResult({ error: "Please enter valid years and amount." });
      return;
    }

    const daysAvailable = historicalPrice.length - 1;
    const startPrice = historicalPrice[0].nav;
    const endPrice = historicalPrice[historicalPrice.length - 1].nav;
    const annualizedReturn = (endPrice / startPrice) ** (252 / daysAvailable) - 1;

    const finalAmount = investmentAmount * ((1 + annualizedReturn) ** investmentYears);
    const growthPercent = ((finalAmount - investmentAmount) / investmentAmount) * 100;

    setResult({
      finalAmount: finalAmount.toFixed(2),
      growthPercent: growthPercent.toFixed(1),
      annualizedReturn: (annualizedReturn * 100).toFixed(2),
    });
  };

  useEffect(() => {
    calculateReturns();
  }, [years, amount, selectedCoin, historicalPrice]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      calculateReturns();
    }
  };

  return (
    <div className="flex flex-col">
      <h3 className="text-white text-lg font-semibold mb-2">Calculate Returns</h3>
      <div className="flex flex-col gap-4 text-gray-300 text-sm">
        <input
          type="number"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          onKeyPress={handleKeyPress}
          className="p-2 rounded bg-gray-900 text-white focus:outline-none border border-gray-700"
          placeholder="Years (e.g., 1)"
          min="0"
          step="0.1"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyPress={handleKeyPress}
          className="p-2 rounded bg-gray-900 text-white focus:outline-none border border-gray-700"
          placeholder="Amount ($)"
          min="0"
          step="1"
        />
        {result ? (
          result.error ? (
            <p className="text-red-500">{result.error}</p>
          ) : (
            <div>
              <p>Final Amount: ${result.finalAmount}</p>
              <p>Growth: {result.growthPercent}%</p>
              <p className="text-xs mt-2 text-dimWhite">
                *Based on historical annualized return of {result.annualizedReturn}%, actual returns may vary.
              </p>
            </div>
          )
        ) : (
          <p>Enter years and amount to calculate returns.</p>
        )}
      </div>
    </div>
  );
};

const CryptoDashboard = () => {
  const { allCoin } = useContext(CoinContext);
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

  // Fetch random coins on initial load
  useEffect(() => {
    if (allCoin.length > 0) {
      const shuffled = [...allCoin].sort(() => 0.5 - Math.random());
      setRandomCoins(shuffled.slice(0, 5));
    }
  }, [allCoin]);

  // Fetch suggestions based on search term
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }
    const filtered = allCoin.filter(coin => coin.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
    setSuggestions(filtered);
  }, [searchTerm, allCoin]);

  // Fetch coin details and historical price when selected or range changes
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

  const filteredPriceData = historicalPrice; // Use full data fetched for the selected range

  const plotData = heatmapData.length > 0 ? [{
    x: heatmapData.map(d => d.month),
    y: heatmapData.map(d => d.dayChange),
    z: heatmapData.map(d => d.dayChange),
    type: "heatmap",
    colorscale: "Viridis",
  }] : [];

  return (
    <div className={`bg-primary ${styles.paddingX} min-h-screen py-6`}>
      <div className="max-w-[1200px] mx-auto">
        <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-md">
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
        </div>

        <div className="mb-6">
          <button
            onClick={handleAiAnalysis}
            disabled={loading || !selectedCoin}
            className={`py-2 px-4 rounded bg-blue-gradient text-primary font-poppins font-medium ${loading || !selectedCoin ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"}`}
          >
            {loading ? "Generating..." : "AI Analysis"}
          </button>
        </div>

        {aiAnalysis && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-md text-white">
            <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
            <p className="text-sm">{aiAnalysis}</p>
          </div>
        )}

        {loading && !aiAnalysis ? (
          <p className="text-white text-center">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : selectedCoin ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {randomCoins.map((coin) => (
              <div
                key={coin.id}
                onClick={() => handleSelectCoin(coin)}
                className="bg-gray-800 rounded-lg p-4 shadow-md hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <h3 className="text-white text-md font-semibold mb-2">{coin.name}</h3>
                <p className="text-gray-400 text-sm">Symbol: {coin.symbol.toUpperCase()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <Chatbot selectedFund={selectedCoin} />
    </div>
  );
};

export default CryptoDashboard;