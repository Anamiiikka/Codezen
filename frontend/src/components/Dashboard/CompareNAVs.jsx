// frontend/src/components/Dashboard/CompareNAVs.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import styles from "../../style";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const CompareNAVs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSchemes, setSelectedSchemes] = useState([]);
  const [navData, setNavData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_URL}/api/schemes?search=${searchTerm}`);
        const schemesArray = Object.entries(response.data).map(([code, name]) => ({
          code,
          name,
        }));
        setSuggestions(schemesArray.slice(0, 10));
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setError("Failed to fetch suggestions. Please try again.");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const fetchNavData = async () => {
      if (selectedSchemes.length === 0) {
        setNavData([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const schemeCodes = selectedSchemes.map(scheme => scheme.code).join(",");
        const response = await axios.get(`${API_URL}/api/compare-navs?scheme_codes=${schemeCodes}`);
        console.log("Fetched NAV data:", response.data); // Debug log
        setNavData(response.data);
      } catch (err) {
        console.error("Error fetching comparison data:", err);
        setError("Failed to fetch comparison data. Please try again.");
        setNavData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNavData();
  }, [selectedSchemes]);

  const handleSearchChange = (e) => {
    e.preventDefault();
    setSearchTerm(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const handleSelectScheme = (scheme) => {
    if (!selectedSchemes.some(s => s.code === scheme.code)) {
      setSelectedSchemes([...selectedSchemes, scheme]);
    }
    setSearchTerm("");
    setSuggestions([]);
  };

  const handleRemoveScheme = (schemeToRemove) => {
    setSelectedSchemes(selectedSchemes.filter(scheme => scheme.code !== schemeToRemove.code));
  };

  return (
    <section className={`${styles.paddingY} ${styles.flexCenter} flex-col min-h-[50vh]`}>
      <h2 className={styles.heading2}>Compare NAVs</h2>
      <div className="relative w-full max-w-[600px] mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          className="p-2 rounded bg-dimBlue text-white w-full focus:outline-none"
          placeholder="Search for mutual funds to compare..."
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-10 bg-black-gradient text-white rounded-lg w-full max-h-60 overflow-y-auto mt-1 shadow-lg">
            {suggestions.map((scheme) => (
              <li
                key={scheme.code}
                onClick={() => handleSelectScheme(scheme)}
                className="p-2 hover:bg-gray-700 cursor-pointer"
              >
                {scheme.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="w-full max-w-[600px] mb-4">
        {selectedSchemes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedSchemes.map((scheme) => (
              <div
                key={scheme.code}
                className="bg-dimBlue text-white px-3 py-1 rounded-full flex items-center"
              >
                {scheme.name}
                <button
                  onClick={() => handleRemoveScheme(scheme)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dimWhite">No schemes selected yet</p>
        )}
      </div>
      <div className="w-full max-w-[600px]">
        {loading ? (
          <p className={styles.paragraph}>Loading...</p>
        ) : error ? (
          <p className={styles.paragraph}>{error}</p>
        ) : selectedSchemes.length > 0 && navData.length > 0 ? (
          <div className="flex justify-center">
            <LineChart width={600} height={300} data={navData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedSchemes.map((scheme) => (
                <Line
                  key={scheme.code}
                  type="monotone"
                  dataKey={scheme.code} // Use scheme.code instead of scheme.name
                  stroke="#00f6ff"
                  name={scheme.name} // Display name in legend
                />
              ))}
            </LineChart>
          </div>
        ) : (
          <p className={styles.paragraph}>Search and select at least one scheme to compare NAVs</p>
        )}
      </div>
    </section>
  );
};

export default CompareNAVs;