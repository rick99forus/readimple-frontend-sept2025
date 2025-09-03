import React, { useState } from 'react';

export default function CookiesPrompt() {
  const [show, setShow] = useState(!localStorage.getItem('cookiesAccepted'));

  const handleAccept = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setShow(false);
  };

  const handleDecide = () => {
    // You can open a modal for more cookie options here
    alert('Cookie preferences coming soon!');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 flex flex-col md:flex-row items-center justify-between z-50">
      <span>
        This app uses cookies to enhance your experience. By continuing, you agree to our privacy policy.
      </span>
      <div className="flex gap-2 mt-2 md:mt-0">
        <button
          className="px-4 py-2 bg-orange-400 text-black rounded font-bold"
          onClick={handleAccept}
        >
          Accept
        </button>
        <button
          className="px-4 py-2 bg-gray-700 text-white rounded font-bold"
          onClick={handleDecide}
        >
          Decide
        </button>
      </div>
    </div>
  );
}