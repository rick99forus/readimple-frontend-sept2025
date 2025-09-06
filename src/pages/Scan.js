// app/components/Scan.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/api';

/* ----------------------------- Device helpers ---------------------------- */
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}
function isCameraSupported() {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}
function isHttpsOrLocalhost() {
  return (
    (typeof window !== 'undefined' &&
      (window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')) ||
    false
  );
}

/* ------------------------------- ISBN utils ------------------------------ */
const ONLY_DIGITS_OR_X = /[^0-9X]/gi;

function cleanIsbn(raw) {
  if (!raw) return '';
  return String(raw).replace(/[-\s]/g, '').toUpperCase();
}

function isIsbn10(str) {
  return /^[0-9]{9}[0-9X]$/.test(str);
}
function isIsbn13(str) {
  return /^[0-9]{13}$/.test(str);
}

function validateIsbn10(isbn10) {
  // 10 chars, last can be X
  if (!isIsbn10(isbn10)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += (i + 1) * parseInt(isbn10[i], 10);
  }
  const checkChar = isbn10[9];
  sum += checkChar === 'X' ? 10 * 10 : 10 * parseInt(checkChar, 10);
  return sum % 11 === 0;
}

function validateIsbn13(isbn13) {
  if (!isIsbn13(isbn13)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = parseInt(isbn13[i], 10);
    sum += i % 2 === 0 ? n : 3 * n;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(isbn13[12], 10);
}

function ean13ToIsbn13(ean) {
  // Books typically have EAN starting with 978 or 979 → that *is* the ISBN-13
  if (ean && ean.length === 13 && (ean.startsWith('978') || ean.startsWith('979'))) {
    return ean;
  }
  return null;
}

function extractIsbnFromScan(decodedText) {
  // 1) Clean obvious junk
  const raw = cleanIsbn(decodedText);
  // 2) Pull only digits/X for validation pass
  const compact = raw.replace(ONLY_DIGITS_OR_X, '');

  // Strict checks first
  if (isIsbn13(compact) && validateIsbn13(compact)) return compact;
  if (isIsbn10(compact) && validateIsbn10(compact)) return compact;

  // Try extracting digits only (some scanners include text)
  const digitsOnly = (decodedText || '').replace(/\D/g, '');
  if (digitsOnly.length === 13 && validateIsbn13(digitsOnly)) {
    // If it’s EAN-13 with 978/979, that is an ISBN-13
    const maybeIsbn13 = ean13ToIsbn13(digitsOnly);
    if (maybeIsbn13) return maybeIsbn13;
    // Non-book EAN-13 — reject
    return null;
  }
  if (digitsOnly.length === 10) {
    // Could be ISBN-10 (no X captured), validate
    if (validateIsbn10(digitsOnly)) return digitsOnly;
  }

  return null;
}

/* ------------------------------- Component -------------------------------- */
const CAMERA_PERMISSION_KEY = 'camera_permission';

export default function Scan({ setShowTabBar, setShowHeader }) {
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMobile, setIsMobile] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(() => {
    return localStorage.getItem(CAMERA_PERMISSION_KEY) || 'unknown';
  });

  const scannerRef = useRef(null);
  const readerRef = useRef(null);
  const handledRef = useRef(false); // prevent duplicate navigations

  // Hide header/tab bar while scanning
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

  useEffect(() => {
    if (cameraPermission === 'granted') {
      setShowScanner(true);
    }
  }, [cameraPermission]);

  /* ----------------------- Camera permission request ---------------------- */
  const requestCameraPermission = async () => {
    try {
      setIsLoading(true);
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      // immediately stop; we just needed permission
      stream.getTracks().forEach((t) => t.stop());
      setCameraPermission('granted');
      localStorage.setItem(CAMERA_PERMISSION_KEY, 'granted');
      setShowScanner(true);
    } catch (e) {
      console.error('Camera permission error:', e);
      setCameraPermission('denied');
      localStorage.setItem(CAMERA_PERMISSION_KEY, 'denied');
      setError(
        'Camera access denied. Please allow camera access in your browser settings to scan barcodes.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* --------------------------- Scanner bootstrap -------------------------- */
  const scannerConfig = useMemo(
    () => ({
      fps: 12,
      qrbox: { width: 280, height: 120 },
      aspectRatio: 1.777778,
      disableFlip: false,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
    }),
    []
  );

  useEffect(() => {
    let scannerInstance;

    async function init() {
      if (!showScanner || cameraPermission !== 'granted' || scanning) return;
      try {
        setScanning(true);
        setError('');

        // Clear any previous scanner instance
        if (scannerRef.current && typeof scannerRef.current.clear === 'function') {
          try {
            await scannerRef.current.clear();
          } catch (e) {
            // ignore
          }
        }

        scannerInstance = new Html5QrcodeScanner('qr-reader', scannerConfig, /* verbose= */ false);
        scannerRef.current = scannerInstance;

        scannerInstance.render(
          async (decodedText /*, decodedResult */) => {
            // Debounce/prevent repeated fires
            if (handledRef.current) return;
            handledRef.current = true;

            try {
              const maybeIsbn = extractIsbnFromScan(decodedText);
              if (!maybeIsbn) {
                throw new Error(
                  "That doesn't look like a book ISBN. Please scan the ISBN barcode on the back cover."
                );
              }

              // Haptic feedback if supported
              try {
                if (navigator?.vibrate) navigator.vibrate(30);
              } catch {}

              setSuccess(`Found barcode: ${maybeIsbn}. Looking up book...`);
              setIsLoading(true);

              // Stop the scanner quickly to avoid duplicate scans
              try {
                await scannerRef.current?.clear();
              } catch {}
              setShowScanner(false);
              setScanning(false);

              // Try your backend endpoints (fastest-first style)
              const calls = [
                apiCall('/api/books/isbn/' + encodeURIComponent(maybeIsbn), { method: 'GET' }),
                apiCall('/api/books/search', {
                  method: 'GET',
                  params: { q: `isbn:${maybeIsbn}` },
                }),
                apiCall('/api/books/search', { method: 'GET', params: { q: maybeIsbn } }),
              ];

              const results = await Promise.allSettled(calls);
              let book = null;

              for (const r of results) {
                if (r.status === 'fulfilled') {
                  const data = r.value?.data ?? {};
                  if (data?.book) {
                    book = data.book;
                    break;
                  } else if (Array.isArray(data?.items) && data.items.length > 0) {
                    book = data.items[0];
                    break;
                  } else if (data?.title) {
                    book = data;
                    break;
                  }
                }
              }

              if (!book) {
                throw new Error(
                  `No book found for ISBN ${maybeIsbn}. Try another scan or use manual search.`
                );
              }

              // Navigate immediately
              navigate('/discover', {
                state: { book, scannedISBN: maybeIsbn, fromScanner: true },
                replace: false,
              });
            } catch (err) {
              console.error('Lookup error:', err);
              setError(err?.message || 'Failed to find book. Please try again.');
              setSuccess('');
              handledRef.current = false; // allow another attempt
            } finally {
              setIsLoading(false);
            }
          },
          (scanError) => {
            // Normal "no barcode" noise is expected; keep it quiet
            const noisy = typeof scanError === 'string' ? scanError : scanError?.message || '';
            if (noisy && !/QR code parse error|NotFoundException/i.test(noisy)) {
              // Optional: console.debug('Scan tick:', noisy);
            }
          }
        );
      } catch (err) {
        console.error('Scanner init error:', err);
        setError('Failed to initialize the camera scanner. Please try again.');
        setScanning(false);
      }
    }

    init();

    // Cleanup on unmount
    return () => {
      (async () => {
        try {
          await scannerInstance?.clear?.();
        } catch {}
      })();
      setScanning(false);
    };
  }, [showScanner, cameraPermission, scanning, scannerConfig]);

  /* -------------------------------- Actions -------------------------------- */
  const restartScanner = () => {
    setError('');
    setSuccess('');
    handledRef.current = false;
    setShowScanner(false);
    setScanning(false);
    setCameraPermission(localStorage.getItem(CAMERA_PERMISSION_KEY) || 'unknown');
  };

  const searchManually = () => navigate('/discover');

  /* ------------------------------- Guards/UI ------------------------------- */
  if (!isHttpsOrLocalhost()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-200 to-white text-black p-6">
        <div className="text-6xl mb-6">🔒</div>
        <h2 className="text-2xl font-bold mb-4 text-center">Secure Connection Required</h2>
        <div className="text-orange-400 text-lg mb-4 text-center">Camera scanning needs HTTPS.</div>
        <div className="text-gray-500 text-sm text-center mb-6">
          Open this page over <span className="font-semibold">https://</span> (or use localhost).
        </div>
        <button
          onClick={searchManually}
          className="px-6 py-3 bg-orange-400 text-black rounded-full font-semibold hover:bg-orange-500 transition"
        >
          Search Books Instead
        </button>
      </div>
    );
  }

  if (!isCameraSupported()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-200 to-white text-black p-6">
        <div className="text-6xl mb-6">📱</div>
        <h2 className="text-2xl font-bold mb-4 text-center">Camera Not Available</h2>
        <div className="text-orange-400 text-lg mb-4 text-center">
          Your browser doesn&apos;t support camera access.
        </div>
        <div className="text-gray-500 text-sm text-center mb-6">
          Try a modern mobile browser (Chrome, Safari, Edge, Firefox).
        </div>
        <button
          onClick={searchManually}
          className="px-6 py-3 bg-orange-400 text-black rounded-full font-semibold hover:bg-orange-500 transition"
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
        <div className="text-4xl mb-3">📚</div>
        <h2 className="text-2xl font-bold mb-2">Scan Book Barcode</h2>
        <p className="text-gray-600 text-sm">Aim at the ISBN barcode on the back cover</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="w-full bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4">
          <div className="text-red-300 text-sm text-center">❌ {error}</div>
        </div>
      )}
      {success && (
        <div className="w-full bg-green-900/50 border border-green-500 rounded-lg p-4 mb-4">
          <div className="text-green-300 text-sm text-center">✅ {success}</div>
        </div>
      )}
      {isLoading && (
        <div className="w-full bg-orange-900/50 border border-orange-500 rounded-lg p-4 mb-4">
          <div className="text-orange-300 text-sm text-center flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-300 mr-2" />
            Searching for book…
          </div>
        </div>
      )}

      {/* Scanner region */}
      <div className="w-full">
        {!showScanner && cameraPermission !== 'granted' && (
          <div className="text-center">
            <div className="bg-gray-200 rounded-lg p-8 mb-4">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-700 mb-6">Allow camera access to scan book barcodes</p>
              <button
                onClick={requestCameraPermission}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-orange-400 text-black rounded-full font-semibold hover:bg-orange-500 transition disabled:opacity-50"
              >
                {isLoading ? 'Requesting Access…' : 'Enable Camera'}
              </button>
            </div>
          </div>
        )}

        {showScanner && (
          <div className="bg-gray-200 rounded-lg overflow-hidden mb-4">
            <div id="qr-reader" ref={readerRef} className="w-full" style={{ minHeight: 300 }} />
          </div>
        )}

        {scanning && (
          <div className="text-center text-gray-600 text-sm mb-4">
            <div className="mb-1">🎯 Center the barcode in the frame</div>
            <div className="mb-1">📏 Hold steady about 15–20cm away</div>
            <div>💡 Ensure good lighting</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="w-full space-y-3">
        {(error || cameraPermission === 'denied') && (
          <button
            onClick={restartScanner}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        )}
        <button
          onClick={searchManually}
          className="w-full px-6 py-3 bg-gray-300 text-black rounded-full font-semibold hover:bg-gray-200 transition"
        >
          Search Manually Instead
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full px-6 py-3 bg-transparent border border-gray-600 text-gray-700 rounded-full font-semibold hover:bg-gray-800 transition"
        >
          Back
        </button>
      </div>

      {/* Tips */}
      <div className="w-full mt-6 text-center">
        <details className="text-gray-800 text-xs">
          <summary className="cursor-pointer hover:text-gray-600">📋 Scanning Tips</summary>
          <div className="mt-2 space-y-1 text-left bg-gray-200/50 rounded p-3">
            <div>• Find the ISBN barcode (usually on the back cover)</div>
            <div>• Hold steady at ~6–8 inches / 15–20cm</div>
            <div>• Ensure good lighting & avoid glare</div>
            <div>• Try small angle adjustments if it won’t read</div>
          </div>
        </details>
      </div>
    </div>
  );
}
