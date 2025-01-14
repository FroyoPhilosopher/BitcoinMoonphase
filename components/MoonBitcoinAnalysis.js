import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import Papa from 'papaparse';
import _ from 'lodash';

const MoonBitcoinAnalysis = () => {
  const [data, setData] = useState([]);
  const [bitcoinData, setBitcoinData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [periodAverage, setPeriodAverage] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState(12);
  const [loading, setLoading] = useState(true);
  
  const periods = [1, 3, 6, 12, 24, 36, 48, 60, 72, 84];
  const phaseOrder = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];
  
  // Fun color scheme
  const colors = {
    moonPhase: '#FF6B6B',    // Coral pink
    periodAvg: '#4ECDC4',    // Turquoise
    background: '#f8f9ff',   // Light blue-tinted background
    grid: '#e0e6ff',         // Light purple grid
    text: '#2C3E50',         // Dark blue-gray text
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const moonResponse = await window.fs.readFile('moon_bitcoin_merged.csv', { encoding: 'utf8' });
        const bitcoinResponse = await window.fs.readFile('bitcoin_daily_range.csv', { encoding: 'utf8' });
        
        const moonParsed = Papa.parse(moonResponse, { header: true, dynamicTyping: true, skipEmptyLines: true });
        const bitcoinParsed = Papa.parse(bitcoinResponse, { header: true, dynamicTyping: true, skipEmptyLines: true });
        
        setData(moonParsed.data);
        setBitcoinData(bitcoinParsed.data);
        setLoading(false);
      } catch (error) {
        console.error('Error reading files:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // ... [keep the existing processData useEffect] ...
  
  useEffect(() => {
    const processData = () => {
      if (!data.length || !bitcoinData.length) return;
      
      const newMoons = data
        .filter(row => row.phase === 'New Moon')
        .map(row => new Date(row.date));
      
      const relevantNewMoons = newMoons.slice(-selectedPeriod - 1);
      const startDate = new Date(relevantNewMoons[0]);
      
      const relevantMoonData = data.filter(row => 
        new Date(row.date) >= startDate
      );
      
      const relevantBitcoinData = bitcoinData.filter(row =>
        new Date(row.date) >= startDate
      );
      
      const periodMean = _.mean(
        relevantBitcoinData
          .map(entry => entry.price_range_percent)
          .filter(range => !isNaN(range))
      );
      setPeriodAverage(Number(periodMean.toFixed(2)));
      
      const defaultData = phaseOrder.map(phase => ({
        phase,
        avgRange: '0.00',
        maxRange: '0.00',
        minRange: '0.00',
        count: 0
      }));
      
      const groupedData = _.groupBy(relevantMoonData, 'phase');
      
      const processed = Object.entries(groupedData).map(([phase, entries]) => {
        const validRanges = entries
          .map(entry => parseFloat(entry.price_range_percent))
          .filter(range => !isNaN(range));
          
        return {
          phase,
          avgRange: validRanges.length ? _.mean(validRanges).toFixed(2) : '0.00',
          maxRange: validRanges.length ? _.max(validRanges).toFixed(2) : '0.00',
          minRange: validRanges.length ? _.min(validRanges).toFixed(2) : '0.00',
          count: validRanges.length,
          periodAvg: periodMean.toFixed(2)
        };
      });
      
      const mergedData = defaultData.map(defaultItem => {
        const processedItem = processed.find(item => item.phase === defaultItem.phase);
        return {
          ...processedItem || defaultItem,
          periodAvg: periodMean.toFixed(2)
        };
      });
      
      const sortedData = _.sortBy(mergedData, item => 
        phaseOrder.indexOf(item.phase)
      );
      
      setProcessedData(sortedData);
    };
    
    processData();
  }, [data, bitcoinData, selectedPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-lg animate-pulse text-indigo-600 font-semibold">
          Loading lunar data... 🌙
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full p-8 rounded-xl shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
          🌙 Bitcoin & The Lunar Cycle 🚀
        </h2>
        <p className="text-gray-600">Exploring the relationship between moon phases and Bitcoin volatility</p>
      </div>
      
      <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Analysis Period:
        </label>
        <select 
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
          className="block w-48 px-3 py-2 bg-white border border-purple-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent hover:border-purple-300 transition-colors"
        >
          {periods.map(period => (
            <option key={period} value={period}>
              {period} {period === 1 ? 'cycle' : 'cycles'} ({(period * 29.5).toFixed(0)} days)
            </option>
          ))}
        </select>
      </div>
      
      <div className="h-96 bg-white p-6 rounded-lg shadow-md">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={processedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis 
              dataKey="phase" 
              label={{ 
                value: 'Moon Phase', 
                position: 'bottom',
                offset: 0,
                fill: colors.text
              }}
              tick={{ fill: colors.text }}
            />
            <YAxis 
              label={{ 
                value: 'Daily Price Range (%)', 
                angle: -90, 
                position: 'insideLeft',
                offset: 10,
                fill: colors.text
              }}
              tick={{ fill: colors.text }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const diff = (parseFloat(data.avgRange) - periodAverage).toFixed(2);
                  const diffPercent = ((parseFloat(data.avgRange) / periodAverage - 1) * 100).toFixed(1);
                  
                  return (
                    <div className="bg-white p-4 border-0 rounded-lg shadow-lg">
                      <div className="font-bold text-lg mb-2 text-purple-600">{data.phase}</div>
                      <div className="space-y-1">
                        <p className="font-semibold text-pink-500">Average: {data.avgRange}%</p>
                        <p className="text-teal-500">Period Avg: {data.periodAvg}%</p>
                        <p className={`font-medium ${parseFloat(diff) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          Difference: {diff}% ({diffPercent}%)
                        </p>
                        <div className="text-gray-600 text-sm pt-2">
                          <p>Max: {data.maxRange}%</p>
                          <p>Min: {data.minRange}%</p>
                          <p>Samples: {data.count}</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{
                paddingTop: '20px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="avgRange" 
              stroke={colors.moonPhase}
              name="Moon Phase Avg"
              strokeWidth={3}
              dot={{ r: 6, fill: colors.moonPhase }}
              activeDot={{ r: 8, fill: colors.moonPhase }}
            />
            <Line 
              type="monotone" 
              dataKey="periodAvg" 
              stroke={colors.periodAvg}
              name="Period Avg"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 p-4 bg-white rounded-lg shadow-md text-sm text-gray-600 space-y-2">
        <p>📊 This visualization shows Bitcoin's price volatility during different moon phases.</p>
        <p>🎯 The solid line shows the average price range during each moon phase.</p>
        <p>📈 The dashed line represents the overall average for the selected period.</p>
        <p>💡 Hover over data points for detailed statistics!</p>
      </div>
    </div>
  );
};

export default MoonBitcoinAnalysis;