import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, clearAuth } from '../utils/auth';

export default function Settings() {
  const profile = getProfile();
  const [kidsMode, setKidsMode] = useState(profile.kidsMode || false);
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/auth');
  };

  const handleKidsModeToggle = () => {
    const updated = { ...profile, kidsMode: !kidsMode };
    localStorage.setItem('profile', JSON.stringify(updated));
    setKidsMode(!kidsMode);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
      <div className="bg-gray-900 rounded-2xl shadow-lg p-8 w-full flex flex-col items-center">
        <h2 className="text-3xl font-bold mb-4 text-orange-400">Settings</h2>
        <div className="w-full mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Kids Mode (Family Safe)</span>
            <input
              type="checkbox"
              checked={kidsMode}
              onChange={handleKidsModeToggle}
              className="form-checkbox h-5 w-5 text-orange-400"
            />
          </div>
          <div className="text-gray-400 text-sm mb-4">
            When enabled, adult or explicit books will be hidden from results.
          </div>
        </div>
        <button
          className="w-full px-6 py-3 bg-orange-400 text-black rounded-full font-bold text-lg hover:bg-orange-500 transition mb-2"
          onClick={handleLogout}
        >
          Log Out
        </button>
        <button
          className="w-full px-6 py-2 bg-gray-700 text-white rounded-full font-bold text-md hover:bg-orange-300 hover:text-black transition"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <button
          onClick={() => {
            Object.keys(localStorage)
              .filter(key => key.startsWith('aiSummary:'))
              .forEach(key => localStorage.removeItem(key));
            alert('AI summaries cache cleared! Reload Discover to generate new answers.');
          }}
          className="px-4 py-2 bg-gray-800 text-white rounded mt-4"
        >
          Clear AI Summary Cache
        </button>
      </div>
    </div>
  );
}