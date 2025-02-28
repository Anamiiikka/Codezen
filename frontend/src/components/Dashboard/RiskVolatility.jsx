// frontend/src/components/Dashboard/RiskVolatility.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import styles from "../../style";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const RiskVolatility = ({ selectedScheme }) => {
  const [metrics, setMetrics] = useState({});
  const [returnsData, setReturnsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRiskData = async () => {
      if (!selectedScheme) {
        setMetrics({});
        setReturnsData([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_URL}/api/risk-volatility/${selectedScheme.code}`);
        setMetrics({
          annualized_volatility: response.data.annualized_volatility,
          annualized_return: response.data.annualized_return,
          sharpe_ratio: response.data.sharpe_ratio,
        });
        setReturnsData(response.data.returns);
      } catch (err) {
        console.error("Error fetching risk data:", err);
        setError("Failed to fetch risk data. Please try again.");
        setMetrics({});
        setReturnsData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRiskData();
  }, [selectedScheme]);

  return (
    <div className="flex flex-col">
      <h3 className="text-white text-lg font-semibold mb-2">Risk & Volatility</h3>
      <div className="w-full">
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : selectedScheme && Object.keys(metrics).length > 0 ? (
          <>
            <div className="text-gray-300 text-sm mb-4">
              <p><span className="font-medium">Annualized Volatility:</span> {(metrics.annualized_volatility * 100).toFixed(2)}%</p>
              <p><span className="font-medium">Annualized Return:</span> {(metrics.annualized_return * 100).toFixed(2)}%</p>
              <p><span className="font-medium">Sharpe Ratio:</span> {metrics.sharpe_ratio.toFixed(2)}</p>
            </div>
            <div className="flex justify-center">
              <LineChart width={350} height={200} data={returnsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" stroke="#fff" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickCount={6} />
                <YAxis stroke="#fff" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ backgroundColor: "#333", border: "none" }} />
                <Line type="monotone" dataKey="returns" stroke="#00f6ff" dot={false} strokeWidth={2} />
              </LineChart>
            </div>
          </>
        ) : (
          <p className="text-gray-400">No risk analysis data available</p>
        )}
      </div>
    </div>
  );
};

export default RiskVolatility;