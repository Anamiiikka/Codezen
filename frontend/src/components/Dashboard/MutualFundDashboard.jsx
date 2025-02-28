// frontend/src/components/Dashboard/MutualFundDashboard.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import Plotly from "react-plotly.js";
import styles from "../../style";
import RiskVolatility from "./RiskVolatility";
import MonteCarloPrediction from "./MonteCarloPrediiction";
import CalculateReturns from "./CalculateReturns";
import Chatbot from "../Chatbot";
import Groq from "groq-sdk";

const MutualFundDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedFund, setSelectedFund] = useState(null);
  const [randomFunds, setRandomFunds] = useState([]);
  const [fundDetails, setFundDetails] = useState({});
  const [historicalNav, setHistoricalNav] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [timePeriod, setTimePeriod] = useState("1M"); // Default to 1 month

  const groqClient = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  // Fetch random funds on initial load
  useEffect(() => {
    const fetchRandomFunds = async () => {
      setLoading(true);
      try {
        const response = await axios.get("http://localhost:8000/api/schemes?search=");
        const allFunds = Object.entries(response.data).map(([code, name]) => ({ code, name }));
        const shuffled = allFunds.sort(() => 0.5 - Math.random());
        setRandomFunds(shuffled.slice(0, 5));
      } catch (err) {
        console.error("Error fetching random funds:", err);
        setError("Failed to load initial funds.");
      } finally {
        setLoading(false);
      }
    };
    fetchRandomFunds();
  }, []);

  // Fetch suggestions based on search term
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`http://localhost:8000/api/schemes?search=${searchTerm}`);
        const schemesArray = Object.entries(response.data).map(([code, name]) => ({
          code,
          name,
        }));
        setSuggestions(schemesArray.slice(0, 10));
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setError("Failed to fetch suggestions.");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch fund details when a fund is selected
  useEffect(() => {
    const fetchFundDetails = async () => {
      if (!selectedFund) {
        setFundDetails({});
        setHistoricalNav([]);
        setHeatmapData([]);
        setAiAnalysis("");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const detailsResponse = await axios.get(`http://localhost:8000/api/scheme-details/${selectedFund.code}`);
        setFundDetails(detailsResponse.data);

        const navResponse = await axios.get(`http://localhost:8000/api/historical-nav/${selectedFund.code}`);
        setHistoricalNav(navResponse.data);

        const heatmapResponse = await axios.get(`http://localhost:8000/api/performance-heatmap/${selectedFund.code}`);
        setHeatmapData(heatmapResponse.data);
      } catch (err) {
        console.error("Error fetching fund details:", err);
        setError("Failed to fetch fund details.");
      } finally {
        setLoading(false);
      }
    };
    fetchFundDetails();
  }, [selectedFund]);

  const handleSearchChange = (e) => {
    e.preventDefault();
    setSearchTerm(e.target.value);
    setSelectedFund(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const handleSelectFund = (fund) => {
    setSelectedFund(fund);
    setSearchTerm(fund.name);
    setSuggestions([]);
  };

  const handleAiAnalysis = async () => {
    if (!selectedFund || Object.keys(fundDetails).length === 0) {
      setAiAnalysis("Please select a fund first!");
      return;
    }

    setLoading(true);
    setAiAnalysis("");

    const latestNav = historicalNav.length > 0 ? parseFloat(historicalNav[historicalNav.length - 1].nav) : 0;
    const oneYearAgoNav = historicalNav.length > 252 ? parseFloat(historicalNav[historicalNav.length - 252].nav) : latestNav;
    const oneYearGrowth = oneYearAgoNav > 0 ? ((latestNav - oneYearAgoNav) / oneYearAgoNav * 100).toFixed(1) : "N/A";
    const bestMonth = heatmapData.length > 0 ? heatmapData.reduce((max, curr) => max.dayChange > curr.dayChange ? max : curr) : { month: "N/A", dayChange: 0 };
    const worstMonth = heatmapData.length > 0 ? heatmapData.reduce((min, curr) => min.dayChange < curr.dayChange ? min : curr) : { month: "N/A", dayChange: 0 };

    const summary = {
      fund_name: selectedFund.name,
      type: `${fundDetails.scheme_type} ${fundDetails.scheme_category}`,
      launched: fundDetails.scheme_start_date ? JSON.parse(fundDetails.scheme_start_date.replace(/'/g, '"')).date : "N/A",
      starting_nav: fundDetails.scheme_start_date ? parseFloat(JSON.parse(fundDetails.scheme_start_date.replace(/'/g, '"')).nav) : 0,
      latest_nav: latestNav,
      one_year_growth: oneYearGrowth,
      best_month: bestMonth.month ? `${bestMonth.month} (+${(bestMonth.dayChange * 100).toFixed(2)}%)` : "N/A",
      worst_month: worstMonth.month ? `${worstMonth.month} (${(worstMonth.dayChange * 100).toFixed(2)}%)` : "N/A",
    };

    const prompt = `
      I have data about a mutual fund called '${summary.fund_name}'. Please provide a simple, friendly explanation for someone new to investing based on this data:
      - Fund Name: ${summary.fund_name}
      - Type: ${summary.type}
      - Launched: ${summary.launched}
      - Starting NAV: ₹${summary.starting_nav.toFixed(2)}
      - Latest NAV: ₹${summary.latest_nav.toFixed(2)}
      - 1-Year Growth: ${summary.one_year_growth}%
      - Best Month: ${summary.best_month}
      - Worst Month: ${summary.worst_month}
      Explain in a conversational tone what this fund is, how it’s doing, and whether it might be a good fit for a beginner. Keep it short, avoid technical jargon, and make it feel like advice from a friend!
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

  // Filter NAV data based on selected time period
  const getFilteredNavData = () => {
    if (!historicalNav.length) return [];
    let days;
    switch (timePeriod) {
      case "1M": days = 30; break;
      case "3M": days = 90; break;
      case "6M": days = 180; break;
      case "1Y": days = 365; break;
      default: days = 30;
    }
    const filtered = historicalNav.slice(-days);
    // Reduce data points for better visualization if more than 30 points
    return filtered.length > 30 ? filtered.filter((_, index) => index % Math.ceil(filtered.length / 30) === 0) : filtered;
  };

  const plotData = heatmapData.length > 0
    ? [{
        x: heatmapData.map((d) => d.month),
        y: heatmapData.map((d) => d.dayChange),
        z: heatmapData.map((d) => d.dayChange),
        type: "heatmap",
        colorscale: "Viridis",
      }]
    : [];

  const filteredNavData = getFilteredNavData();

  return (
    <div className={`bg-primary ${styles.paddingX} min-h-screen py-6`}>
      <div className="max-w-[1200px] mx-auto">
        <div className="bg-gray-800 rounded-lg p-4 mb-6 shadow-md relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            className="w-full p-2 rounded bg-gray-900 text-white focus:outline-none border border-gray-700"
            placeholder="Search for a mutual fund..."
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 bg-gray-800 text-white rounded-lg w-[300px] max-h-60 overflow-y-auto mt-2 shadow-lg">
              {suggestions.map((fund) => (
                <li
                  key={fund.code}
                  onClick={() => handleSelectFund(fund)}
                  className="p-2 hover:bg-gray-700 cursor-pointer"
                >
                  {fund.name}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={handleAiAnalysis}
            disabled={loading || !selectedFund}
            className={`mt-4 py-2 px-4 rounded bg-blue-gradient text-primary font-poppins font-medium ${loading || !selectedFund ? "opacity-50 cursor-not-allowed" : "hover:bg-secondary"}`}
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
        ) : selectedFund ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-4 shadow-md">
              <h3 className="text-white text-lg font-semibold mb-2">{selectedFund.name}</h3>
              <div className="text-gray-300 text-sm">
                {Object.entries(fundDetails).slice(0, 5).map(([key, value]) => (
                  <p key={key} className="mb-1">
                    <span className="font-medium">{key.replace(/_/g, " ")}:</span>{" "}
                    {key === "scheme_start_date" && value.includes("date")
                      ? (() => {
                          const parsed = JSON.parse(value.replace(/'/g, '"'));
                          return `${parsed.date} (NAV: ${parsed.nav})`;
                        })()
                      : value}
                  </p>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white text-lg font-semibold">Historical NAV</h3>
                <div className="flex gap-2">
                  {["1M", "3M", "6M", "1Y"].map((period) => (
                    <button
                      key={period}
                      onClick={() => setTimePeriod(period)}
                      className={`px-2 py-1 rounded text-sm ${timePeriod === period ? "bg-blue-gradient text-primary" : "bg-gray-700 text-white"} hover:bg-secondary`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              {filteredNavData.length > 0 ? (
                <LineChart width={350} height={200} data={filteredNavData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="date" stroke="#fff" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickCount={6} />
                  <YAxis stroke="#fff" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ backgroundColor: "#333", border: "none" }} />
                  <Line type="monotone" dataKey="nav" stroke="#00f6ff" dot={false} strokeWidth={2} />
                </LineChart>
              ) : (
                <p className="text-gray-400">No NAV data</p>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-4 shadow-md">
              <CalculateReturns selectedScheme={selectedFund} />
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
              <RiskVolatility selectedScheme={selectedFund} />
            </div>

            <div className="bg-gray-800 rounded-lg p-4 shadow-md">
              <MonteCarloPrediction selectedScheme={selectedFund} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {randomFunds.map((fund) => (
              <div
                key={fund.code}
                onClick={() => handleSelectFund(fund)}
                className="bg-gray-800 rounded-lg p-4 shadow-md hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <h3 className="text-white text-md font-semibold mb-2">{fund.name}</h3>
                <p className="text-gray-400 text-sm">Code: {fund.code}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <Chatbot selectedFund={selectedFund} />
    </div>
  );
};

export default MutualFundDashboard;