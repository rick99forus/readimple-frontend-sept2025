import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/api';

// Device detection functions
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isCameraSupported() {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

function isHttpsOrLocalhost() {
  return window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
}

// ISBN validation function
function isValidISBN(isbn) {
  // Remove hyphens and spaces
  const cleanISBN = isbn.replace(/[-\s]/g, '');
  
  // Check if it's a valid ISBN-10 or ISBN-13
  return /^\d{10}(\d{3})?$/.test(cleanISBN) && cleanISBN.length >= 10;
}

export default function Scan({ setShowTabBar, setShowHeader }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMobile, setIsMobile] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [foundBook, setFoundBook] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState('unknown'); // 'unknown', 'granted', 'denied'
  const scannerRef = useRef(null);
  const readerRef = useRef(null);

  // Hide header and tab bar on scan page
  useEffect(() => {
    setShowHeader?.(false);
    setShowTabBar?.(false);
    
    return () => {
      setShowHeader?.(true);
      setShowTabBar?.(true);
    };
  }, [setShowHeader, setShowTabBar]);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      setIsLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: "environment" } // Prefer back camera
        } 
      });
      
      // Stop the stream immediately - we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
      
      setCameraPermission('granted');
      setShowScanner(true);
      setError('');
    } catch (err) {
      console.error('Camera permission error:', err);
      setCameraPermission('denied');
      setError('Camera access denied. Please allow camera access to scan barcodes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize scanner
  useEffect(() => {
    let scanner;
    
    if (showScanner && cameraPermission === 'granted' && !scanning) {
      const initScanner = async () => {
        try {
          setScanning(true);
          setError('');
          
          // Clear any existing scanner
          if (scannerRef.current) {
            try {
              await scannerRef.current.clear();
            } catch (e) {
              console.warn('Scanner clear warning:', e);
            }
          }

          const config = {
            fps: 10,
            qrbox: { width: 280, height: 120 }, // Rectangular box better for barcodes
            aspectRatio: 1.777778, // 16:9 aspect ratio
            disableFlip: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true // Use native barcode detection if available
            },
            formatsToSupport: [
              Html5QrcodeScanner.SUPPORTED_FORMATS.EAN_13,
              Html5QrcodeScanner.SUPPORTED_FORMATS.EAN_8,
              Html5QrcodeScanner.SUPPORTED_FORMATS.CODE_128,
              Html5QrcodeScanner.SUPPORTED_FORMATS.CODE_39,
              Html5QrcodeScanner.SUPPORTED_FORMATS.QR_CODE
            ],
            showTorchButtonIfSupported: true, // Show flashlight if available
            showZoomSliderIfSupported: true   // Show zoom if available
          };

          scanner = new Html5QrcodeScanner("qr-reader", config, false);
          scannerRef.current = scanner;

          scanner.render(
            (decodedText, decodedResult) => {
              console.log('📱 Barcode scanned:', decodedText);
              handleScan(decodedText, decodedResult);
            },
            (error) => {
              // Ignore scanning errors - just means no barcode found yet
              if (!error.includes('No MultiFormat Readers')) {
                console.log('Scanning...', error);
              }
            }
          );

        } catch (err) {
          console.error('Scanner initialization error:', err);
          setError('Failed to initialize camera scanner. Please try again.');
          setScanning(false);
        }
      };

      initScanner();
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.warn('Scanner cleanup warning:', e));
      }
      setScanning(false);
    };
  }, [showScanner, cameraPermission]);

  // Handle barcode scan
  const handleScan = async (decodedText, decodedResult) => {
    console.log('🔍 Processing scan result:', decodedText);
    
    // Stop scanner immediately to prevent multiple scans
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
        setShowScanner(false);
        setScanning(false);
      } catch (e) {
        console.warn('Scanner stop warning:', e);
      }
    }

    setIsLoading(true);
    setError('');

    try {
      // Validate and clean the scanned code
      let isbn = decodedText.trim();
      
      // If it's not a valid ISBN, try to extract numbers
      if (!isValidISBN(isbn)) {
        const extractedNumbers = isbn.replace(/\D/g, '');
        if (isValidISBN(extractedNumbers)) {
          isbn = extractedNumbers;
        } else {
          throw new Error('Invalid barcode format. Please scan a book\'s ISBN barcode.');
        }
      }

      console.log('📚 Looking up book with ISBN:', isbn);
      setSuccess(`Found barcode: ${isbn}. Looking up book...`);

      // Search for book using multiple methods
      const searchPromises = [
        // Method 1: Search by ISBN
        apiCall(`/api/books/search`, {
          method: 'GET',
          params: { q: `isbn:${isbn}` }
        }),
        // Method 2: Direct ISBN search
        apiCall(`/api/books/isbn/${isbn}`, {
          method: 'GET'
        }),
        // Method 3: General search with the code
        apiCall(`/api/books/search`, {
          method: 'GET',
          params: { q: isbn }
        })
      ];

      const results = await Promise.allSettled(searchPromises);
      
      let book = null;
      
      // Find the first successful result with a book
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const data = result.value.data;
          if (data.items && data.items.length > 0) {
            book = data.items[0];
            break;
          } else if (data.book) {
            book = data.book;
            break;
          } else if (data.title) {
            book = data;
            break;
          }
        }
      }

      if (book) {
        console.log('✅ Book found:', book.title);
        setFoundBook(book);
        setSuccess(`Found: "${book.title}" by ${book.author || 'Unknown Author'}`);
        
        // Navigate to discover page after a short delay to show success message
        setTimeout(() => {
          navigate('/discover', { 
            state: { 
              book,
              scannedISBN: isbn,
              fromScanner: true
            } 
          });
        }, 1500);
        
      } else {
        throw new Error(`No book found for ISBN: ${isbn}. Try scanning another book or search manually.`);
      }

    } catch (err) {
      console.error('❌ Book lookup error:', err);
      setError(err.message || 'Failed to find book. Please try scanning again or search manually.');
      setSuccess('');
      
      // Allow retry after error
      setTimeout(() => {
        setShowScanner(false);
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  // Restart scanner
  const restartScanner = () => {
    setError('');
    setSuccess('');
    setFoundBook(null);
    setCameraPermission('unknown');
    setShowScanner(false);
    setScanning(false);
  };

  // Manual search fallback
  const searchManually = () => {
    navigate('/discover');
  };

  // HTTPS check
  if (!isHttpsOrLocalhost()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-200 to-white text-black p-6">
        <div className="text-6xl mb-6">🔒</div>
        <h2 className="text-2xl font-bold mb-4 text-center">Secure Connection Required</h2>
        <div className="text-orange-400 text-lg mb-4 text-center">
          Camera scanning requires HTTPS for security.
        </div>
        <div className="text-gray-400 text-sm text-center mb-6">
          Please use a secure (https://) connection to access the camera.
        </div>
        <button
          onClick={searchManually}
          className="px-6 py-3 bg-orange-400 text-black rounded-full font-semibold hover:bg-orange-500 transition-all duration-200"
        >
          Search Books Instead
        </button>
      </div>
    );
  }

  // Camera support check
  if (!isCameraSupported()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-200 to-white text-black p-6">
        <div className="text-6xl mb-6">📱</div>
        <h2 className="text-2xl font-bold mb-4 text-center">Camera Not Available</h2>
        <div className="text-orange-400 text-lg mb-4 text-center">
          Your browser doesn't support camera access.
        </div>
        <div className="text-gray-400 text-sm text-center mb-6">
          Please use a modern browser (Chrome, Safari, Edge, Firefox) on your mobile device.
        </div>
        <button
          onClick={searchManually}
          className="px-6 py-3 bg-orange-400 text-black rounded-full font-semibold hover:bg-orange-500 transition-all duration-200"
        >
          Search Books Instead
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-200 to-white text-black p-4">
      {/* Header */}
      <div className="w-full text-center mb-6">
        <div className="text-4xl mb-4">📚</div>
        <h2 className="text-2xl font-bold mb-2">Scan Book Barcode</h2>
        <p className="text-gray-600 text-sm">
          Point your camera at the ISBN barcode on the back of any book
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="w-full bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4">
          <div className="text-red-400 text-sm text-center">
            ❌ {error}
          </div>
        </div>
      )}

      {success && (
        <div className="w-full bg-green-900/50 border border-green-500 rounded-lg p-4 mb-4">
          <div className="text-green-400 text-sm text-center">
            ✅ {success}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="w-full bg-orange-900/50 border border-orange-500 rounded-lg p-4 mb-4">
          <div className="text-orange-400 text-sm text-center flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400 mr-2"></div>
            {foundBook ? 'Opening book details...' : 'Searching for book...'}
          </div>
        </div>
      )}

      {/* Scanner Area */}
      <div className="w-full">
        {!showScanner && cameraPermission !== 'granted' && (
          <div className="text-center">
            <div className="bg-gray-200 rounded-lg p-8 mb-4">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-700 mb-6">
                Allow camera access to scan book barcodes
              </p>
              <button
                onClick={requestCameraPermission}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-orange-400 text-black rounded-full font-semibold hover:bg-orange-500 transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Requesting Access...' : 'Enable Camera'}
              </button>
            </div>
          </div>
        )}

        {showScanner && (
          <div className="bg-gray-200 rounded-lg overflow-hidden mb-4">
            <div 
              id="qr-reader" 
              ref={readerRef}
              className="w-full"
              style={{ minHeight: '300px' }}
            />
          </div>
        )}

        {/* Scanner Instructions */}
        {scanning && (
          <div className="text-center text-gray-600 text-sm mb-4">
            <div className="mb-2">🎯 Center the barcode in the frame</div>
            <div className="mb-2">📏 Keep steady and at arm's length</div>
            <div>💡 Ensure good lighting</div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-3">
        {(error || cameraPermission === 'denied') && (
          <button
            onClick={restartScanner}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all duration-200"
          >
            Try Again
          </button>
        )}

        <button
          onClick={searchManually}
          className="w-full px-6 py-3 bg-gray-300 text-black rounded-full font-semibold hover:bg-gray-200 transition-all duration-200"
        >
          Search Manually Instead
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full px-6 py-3 bg-transparent border border-gray-600 text-gray-700 rounded-full font-semibold hover:bg-gray-800 transition-all duration-200"
        >
          Back
        </button>
      </div>

      {/* Tips */}
      <div className="w-full mt-6 text-center">
        <details className="text-gray-800 text-xs">
          <summary className="cursor-pointer hover:text-gray-600">
            📋 Scanning Tips
          </summary>
          <div className="mt-2 space-y-1 text-left bg-gray-200/50 rounded p-3">
            <div>• Look for the ISBN barcode (usually on the back cover)</div>
            <div>• Hold your phone steady about 6-8 inches away</div>
            <div>• Make sure there's enough light</div>
            <div>• Try different angles if the first scan doesn't work</div>
            <div>• The barcode should be clearly visible in the camera</div>
          </div>
        </details>
      </div>
    </div>
  );
}