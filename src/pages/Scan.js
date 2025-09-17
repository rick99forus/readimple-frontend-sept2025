// filepath: src/components/Scan.js
import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/api';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { handleBookClick } from '../utils/navigation';

/* ------------------------------------------------------------------ */
/*                          Helper utilities                           */
/* ------------------------------------------------------------------ */

function isHttpsOrLocalhost() {
  return (
    (typeof window !== 'undefined' &&
      (window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')) ||
    false
  );
}

function isCameraSupported() {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

// ISBN helpers
const ONLY_DIGITS_OR_X = /[^0-9X]/gi;
const cleanIsbn = (raw) => (raw ? String(raw).replace(/[-\s]/g, '').toUpperCase() : '');
const isIsbn10 = (s) => /^[0-9]{9}[0-9X]$/.test(s);
const isIsbn13 = (s) => /^[0-9]{13}$/.test(s);

function validateIsbn10(isbn10) {
  if (!isIsbn10(isbn10)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (i + 1) * parseInt(isbn10[i], 10);
  const check = isbn10[9] === 'X' ? 10 : parseInt(isbn10[9], 10);
  sum += 10 * check;
  return sum % 11 === 0;
}
function validateIsbn13(isbn13) {
  if (!isIsbn13(isbn13)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (i % 2 === 0 ? 1 : 3) * parseInt(isbn13[i], 10);
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(isbn13[12], 10);
}
const ean13ToIsbn13 = (ean) => (ean?.length === 13 && (ean.startsWith('978') || ean.startsWith('979')) ? ean : null);

function extractIsbnFromText(decodedText) {
  if (!decodedText) return null;
  const raw = cleanIsbn(decodedText);
  const compact = raw.replace(ONLY_DIGITS_OR_X, '');
  if (isIsbn13(compact) && validateIsbn13(compact)) return compact;
  if (isIsbn10(compact) && validateIsbn10(compact)) return compact;

  const digits = decodedText.replace(/\D/g, '');
  if (digits.length === 13 && validateIsbn13(digits)) return ean13ToIsbn13(digits);
  if (digits.length === 10 && validateIsbn10(digits)) return digits;
  return null;
}

// Small, safe delay
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/*                             Component                               */
/* ------------------------------------------------------------------ */

const CAMERA_PERMISSION_KEY = 'camera_permission_v2';

export default function Scan({ setShowTabBar, setShowHeader }) {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  // UI state
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Camera / stream state
  const [cameraPermission, setCameraPermission] = useState(
    () => localStorage.getItem(CAMERA_PERMISSION_KEY) || 'unknown'
  );
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomCap, setZoomCap] = useState(null);

  // Flow state
  const [candidates, setCandidates] = useState([]); // book candidates to confirm
  const [capturedImage, setCapturedImage] = useState(null); // dataURL of cover capture
  const [confirmOpen, setConfirmOpen] = useState(false); // confirmation modal

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null); // offscreen for capture
  const streamRef = useRef(null);
  const zxReaderRef = useRef(null);
  const scanRAF = useRef(0);
  const lastCodeRef = useRef({ value: '', at: 0 });

  // Hide app chrome while scanning
  useEffect(() => {
    setShowHeader?.(false);
    setShowTabBar?.(false);
    return () => {
      setShowHeader?.(true);
      setShowTabBar?.(true);
    };
  }, [setShowHeader, setShowTabBar]);

  /* --------------------------- Camera bootstrap --------------------------- */

  const startCamera = async () => {
    try {
      setError('');
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // advanced zoom/torch may be set later
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();

      // Torch + zoom capabilities
      const [track] = stream.getVideoTracks();
      const caps = track.getCapabilities?.() || {};
      setTorchAvailable(!!caps.torch);
      if (caps.zoom) {
        setZoomCap({
          min: caps.zoom.min,
          max: caps.zoom.max,
          step: caps.zoom.step || 0.1,
        });
      }

      // Start scanning
      startScanning();
    } catch (e) {
      console.error(e);
      setError('Unable to access camera. Please allow camera permissions in your browser settings.');
    }
  };

  const stopCamera = async () => {
    try {
      if (scanRAF.current) cancelAnimationFrame(scanRAF.current);
      zxReaderRef.current?.reset?.();
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    } catch {}
  };

  // Ask for permission proactively
  const requestPermission = async () => {
    try {
      setIsLoading(true);
      await startCamera();
      setCameraPermission('granted');
      localStorage.setItem(CAMERA_PERMISSION_KEY, 'granted');
    } catch (e) {
      setCameraPermission('denied');
      localStorage.setItem(CAMERA_PERMISSION_KEY, 'denied');
      setError('Camera access denied. Please allow camera access to scan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cameraPermission === 'granted') startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraPermission]);

  /* ----------------------------- Torch & Zoom ----------------------------- */

  const toggleTorch = async () => {
    try {
      const stream = streamRef.current;
      if (!stream) return;
      const [track] = stream.getVideoTracks();
      const caps = track.getCapabilities?.() || {};
      if (!caps.torch) return;
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((v) => !v);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  const setZoom = async (val) => {
    try {
      const stream = streamRef.current;
      if (!stream) return;
      const [track] = stream.getVideoTracks();
      const caps = track.getCapabilities?.() || {};
      if (!caps.zoom) return;
      await track.applyConstraints({ advanced: [{ zoom: val }] });
    } catch (e) {
      console.warn('Zoom change failed', e);
    }
  };

  /* ------------------------------ Scanning -------------------------------- */

  const useBarcodeDetector = 'BarcodeDetector' in window;

  const startScanning = () => {
    if (useBarcodeDetector) {
      runBDLoop();
    } else {
      // ZXing fallback (continuous)
      const reader = new BrowserMultiFormatReader();
      zxReaderRef.current = reader;
      reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result) handleDecodedText(result.getText());
          
            // non NotFound errors are rare; keep quiet to avoid log spam
          
        }
      );
    }
  };

  const runBDLoop = async () => {
    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code'],
    });

    const tick = async () => {
      try {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          scanRAF.current = requestAnimationFrame(tick);
          return;
        }
        const barcodes = await detector.detect(video);
        if (barcodes && barcodes.length) {
          // Prefer EAN_13 first
          barcodes.sort((a, b) => {
            const pa = a.format === 'ean_13' ? 0 : 1;
            const pb = b.format === 'ean_13' ? 0 : 1;
            return pa - pb;
          });
          const code = barcodes[0]?.rawValue || barcodes[0]?.rawValue || '';
          if (code) handleDecodedText(code);
        }
      } catch (e) {
        // BarcodeDetector errors are expected sometimes (no code). Ignore quietly.
      } finally {
        scanRAF.current = requestAnimationFrame(tick);
      }
    };
    scanRAF.current = requestAnimationFrame(tick);
  };

  // Debounce findCandidates to avoid rapid API calls
  const findCandidatesDebounced = (() => {
    let timeout;
    return async (params) => {
      if (timeout) clearTimeout(timeout);
      return new Promise((resolve) => {
        timeout = setTimeout(async () => {
          resolve(await findCandidates(params));
        }, 150); // 150ms debounce
      });
    };
  })();

  const handleDecodedText = async (decoded) => {
    const now = Date.now();
    // prevent flapping: require stable code for 250ms
    if (lastCodeRef.current.value === decoded && now - lastCodeRef.current.at < 250) return;
    lastCodeRef.current = { value: decoded, at: now };

    const isbn = extractIsbnFromText(decoded);
    if (!isbn) return; // Ignore non-ISBN codes

    // Light haptic tap
    try {
      navigator?.vibrate?.(20);
    } catch {}

    await stopCamera(); // pause live scanning while we fetch
    setNote(`Detected ISBN ${isbn}. Finding matches…`);
    setIsLoading(true);

    setTimeout(async () => {
      try {
        const list = await findCandidatesDebounced({ isbn });
        if (list.length === 0) throw new Error('No book found for that barcode.');
        startTransition(() => {
          setCandidates(list.slice(0, 6));
          setCapturedImage(null);
          setConfirmOpen(true);
          setNote('');
        });
      } catch (e) {
        setError(e.message || 'Failed to find book for that barcode.');
        await sleep(900);
        setError('');
        startCamera();
      } finally {
        setIsLoading(false);
      }
    }, 0);
  };

  /* ------------------------- Capture & OCR fallback ------------------------ */

  const captureCover = async () => {
    try {
      const video = videoRef.current;
      if (!video) return;
      const canvas = canvasRef.current;
      const w = Math.min(720, video.videoWidth || 720);
      const h = Math.floor((w / (video.videoWidth || 1)) * (video.videoHeight || 1));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);

      setIsLoading(true);
      setNote('Analyzing cover…');

      // Lazy-load Tesseract only now (optional)
      let ocrText = '';
      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker({ logger: () => {} });
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const { data } = await worker.recognize(canvas);
        await worker.terminate();
        ocrText = (data?.text || '').replace(/\s+/g, ' ').trim();
      } catch {
        // If OCR fails or lib not installed, continue—user can confirm manually.
      }

      const queryGuess = buildQueryFromOcr(ocrText);
      const list = await findCandidatesDebounced({ isbn: null, text: queryGuess });
      if (list.length === 0) throw new Error('Could not match that cover. Try again or type the title.');

      setCandidates(list.slice(0, 6));
      setConfirmOpen(true);
      setNote('');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Cover capture failed. Try again.');
      await sleep(1000);
      setError('');
    } finally {
      setIsLoading(false);
    }
  };

  const buildQueryFromOcr = (text) => {
    if (!text) return '';
    // naive heuristic: take 5–8 longest words ignoring ALL CAPS blurb
    const words = text
      .split(/[^A-Za-z0-9’'-]+/)
      .filter((w) => w && w.length > 2 && w.length < 20)
      .slice(0, 40);
    const scored = words
      .map((w) => ({ w, s: w.length + (/[A-Z][a-z]/.test(w) ? 2 : 0) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((x) => x.w);
    return scored.join(' ');
  };

  /* ---------------------------- Book candidates --------------------------- */

  async function findCandidates({ isbn, text }) {
    // 1) Backend first
    const tries = [];
    if (isbn) {
      tries.push(apiCall('/api/books/isbn/' + encodeURIComponent(isbn), { method: 'GET' }));
      tries.push(apiCall('/api/books/search', { method: 'GET', params: { q: 'isbn:' + isbn } }));
    }
    if (text) {
      tries.push(apiCall('/api/books/search', { method: 'GET', params: { q: text } }));
    }

    const settled = await Promise.allSettled(tries);
    let items = [];
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        const data = r.value?.data || {};
        if (Array.isArray(data.items)) items.push(...data.items);
        if (data.book) items.push(data.book);
        if (data.title) items.push(data);
      }
    }

    // 2) Fallback to Google Books (no backend required)
    if (items.length === 0) {
      let url = '';
      if (isbn) {
        url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=5`;
      } else if (text) {
        url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(text)}&maxResults=8`;
      }
      if (url) {
        try {
          const res = await fetch(url);
          const json = await res.json();
          const vols = json.items || [];
          items = vols.map((v) => normalizeVolume(v));
        } catch {}
      }
    }

    // normalize + dedupe
    const norm = items.map((b) => normalizeAny(b));
    const seen = new Set();
    const out = [];
    for (const b of norm) {
      const key = `${b.title}::${b.author}`;
      if (!seen.has(key)) {
        out.push(b);
        seen.add(key);
      }
    }
    return out;
  }

  function normalizeVolume(v) {
    const vi = v.volumeInfo || {};
    const img =
      vi.imageLinks?.thumbnail?.replace('http://', 'https://') ||
      vi.imageLinks?.smallThumbnail?.replace('http://', 'https://') ||
      '';
    const isbn13 =
      vi.industryIdentifiers?.find((x) => x.type === 'ISBN_13')?.identifier ||
      vi.industryIdentifiers?.find((x) => x.type === 'ISBN_10')?.identifier ||
      '';
    return {
      id: v.id,
      title: vi.title || 'Untitled',
      author: Array.isArray(vi.authors) ? vi.authors[0] : vi.authors || 'Unknown',
      coverImage: img,
      description: vi.description || '',
      publishedDate: vi.publishedDate || '',
      pageCount: vi.pageCount || undefined,
      categories: vi.categories || [],
      isbn_13: isbn13 || '',
      previewLink: vi.previewLink,
      infoLink: vi.infoLink,
      _genre: (vi.categories && vi.categories[0]) || 'Books',
      source: 'google_books',
    };
  }

  function normalizeAny(b) {
    if (b.volumeInfo) return normalizeVolume(b);
    return {
      id: b.id || `${b.title}-${b.author}`.replace(/\s+/g, '-').toLowerCase(),
      title: b.title || 'Untitled',
      author: b.author || (Array.isArray(b.authors) ? b.authors[0] : 'Unknown'),
      coverImage:
        b.coverImage ||
        b.image ||
        b.thumbnail ||
        '',
      description: b.description || '',
      publishedDate: b.publishedDate || '',
      pageCount: b.pageCount || undefined,
      categories: b.categories || [],
      isbn_13: b.isbn_13 || b.isbn13 || b.isbn || '',
      previewLink: b.previewLink,
      infoLink: b.infoLink,
      _genre: b._genre || (Array.isArray(b.categories) && b.categories[0]) || 'Books',
      source: b.source || 'mixed',
    };
  }

  /* ------------------------------ Navigation ------------------------------ */

  const resumeScan = async () => {
    setConfirmOpen(false);
    setCandidates([]);
    setCapturedImage(null);
    setNote('');
    await startCamera();
  };

  // Use React.memo for candidate items
  const CandidateItem = React.memo(function CandidateItem({ b, i, onSelect }) {
    return (
      <div key={b.id || i} className="flex items-center gap-3 p-3">
        <div className="relative w-14 h-20 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 flex-shrink-0">
          <img
            src={shrinkCover(b.coverImage)}
            alt={b.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => (e.currentTarget.src = '/default-cover.png')}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-white/10 to-transparent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-neutral-900 line-clamp-2">{b.title}</div>
          <div className="text-[12px] text-neutral-600 italic line-clamp-1">by {b.author || 'Unknown'}</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            {(b.categories && b.categories[0]) || b._genre || 'Books'}
            {b.publishedDate ? ` · ${b.publishedDate}` : ''}
          </div>
        </div>
        <button
          onClick={() => onSelect(b)}
          className="px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 active:scale-[0.98]"
        >
          This one
        </button>
      </div>
    );
  });

  /* --------------------------------- UI ---------------------------------- */

  if (!isHttpsOrLocalhost()) {
    return (
      <Guard
        icon="🔒"
        title="Secure Connection Required"
        message="Camera scanning needs HTTPS (or localhost)."
        actionLabel="Search Books Instead"
        onAction={() => navigate('/discover')}
      />
    );
  }

  if (!isCameraSupported()) {
    return (
      <Guard
        icon="📱"
        title="Camera Not Available"
        message="Your browser doesn't support camera access. Try a modern mobile browser."
        actionLabel="Search Books Instead"
        onAction={() => navigate('/discover')}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-200 to-white text-black p-4 flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-3">
        <div className="text-4xl mb-2">📚</div>
        <h2 className="text-2xl font-bold">Live Book Scanner</h2>
        <p className="text-gray-600 text-sm">Scan barcode or capture the cover to find the book</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="w-full bg-red-900/50 border border-red-500 rounded-lg p-3 mb-3">
          <div className="text-red-200 text-sm text-center">❌ {error}</div>
        </div>
      )}
      {note && (
        <div className="w-full bg-blue-900/50 border border-blue-500 rounded-lg p-3 mb-3">
          <div className="text-blue-200 text-sm text-center">ℹ️ {note}</div>
        </div>
      )}
      {isLoading && (
        <div className="w-full bg-orange-900/50 border border-orange-500 rounded-lg p-3 mb-3">
          <div className="text-orange-200 text-sm text-center flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-300 mr-2" />
            Working…
          </div>
        </div>
      )}

      {/* Live camera */}
      <div className="relative rounded-xl overflow-hidden bg-black w-full max-w-xl mx-auto">
        <video
          ref={videoRef}
          className="w-full h-auto"
          playsInline
          muted
          autoPlay
        />
        {/* Scan guide */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[82%] h-28 border-2 border-white/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
        </div>

        {/* Controls overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTorch}
              disabled={!torchAvailable}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                torchAvailable
                  ? torchOn
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white/90 text-black'
                  : 'bg-white/50 text-black/50'
              }`}
              title={torchAvailable ? 'Toggle flashlight' : 'Flash not supported'}
            >
              🔦 Flash
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={captureCover}
              className="px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-semibold shadow active:scale-[0.98]"
            >
              Capture Cover
            </button>
          </div>
        </div>
      </div>

      {/* Zoom slider */}
      {zoomCap && (
        <div className="mt-3 w-full max-w-xl mx-auto px-2">
          <input
            type="range"
            defaultValue={zoomCap.min}
            min={zoomCap.min}
            max={zoomCap.max}
            step={zoomCap.step}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className="text-[11px] text-center text-neutral-500 mt-1">Zoom</div>
        </div>
      )}

      {/* Permission CTA */}
      {cameraPermission !== 'granted' && (
        <div className="mt-4 w-full max-w-xl mx-auto">
          <button
            onClick={requestPermission}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition disabled:opacity-60"
          >
            {isLoading ? 'Requesting Camera…' : 'Enable Camera'}
          </button>
        </div>
      )}

      {/* Secondary actions */}
      <div className="mt-3 w-full max-w-xl mx-auto grid grid-cols-2 gap-2">
        <button
          onClick={() => navigate('/discover')}
          className="px-4 py-2 rounded-full bg-neutral-200 text-black font-semibold hover:bg-neutral-300 transition"
        >
          Search Manually
        </button>
        <button
          onClick={async () => {
            await stopCamera();
            navigate(-1);
          }}
          className="px-4 py-2 rounded-full border border-neutral-400 text-neutral-700 font-semibold hover:bg-neutral-100 transition"
        >
          Back
        </button>
      </div>

      {/* Offscreen canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Confirmation modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) resumeScan();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-orange-500 text-white">✓</span>
                <h3 className="text-lg font-bold">Is this your book?</h3>
              </div>
              <button
                onClick={resumeScan}
                className="w-9 h-9 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Optional captured image preview */}
            {capturedImage && (
              <div className="px-4 pt-3">
                <div className="text-xs text-neutral-500 mb-1">Captured cover preview</div>
                <img
                  src={capturedImage}
                  alt="Captured cover"
                  className="w-full max-h-56 object-contain rounded-lg border border-neutral-200"
                />
              </div>
            )}

            {/* Candidates */}
            <div className="max-h-[65vh] overflow-y-auto p-2">
              {candidates.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">No candidates found.</div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {candidates.map((b, i) => (
                    <CandidateItem key={b.id || i} b={b} i={i} onSelect={(book) => handleBookClick(navigate, book)} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-3 border-t border-neutral-200 flex items-center justify-between">
              <button
                onClick={resumeScan}
                className="px-4 py-2 rounded-full bg-neutral-100 text-neutral-800 font-semibold hover:bg-neutral-200"
              >
                Rescan
              </button>
              <button
                onClick={() => navigate('/discover')}
                className="px-4 py-2 rounded-full bg-white border border-neutral-300 text-neutral-700 font-semibold hover:bg-neutral-50"
              >
                Search Manually
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Small helpers ------------------------------ */

function Guard({ icon, title, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-200 to-white text-black p-6">
      <div className="text-6xl mb-6">{icon}</div>
      <h2 className="text-2xl font-bold mb-4 text-center">{title}</h2>
      <div className="text-orange-500 text-lg mb-3 text-center">{message}</div>
      <button
        onClick={onAction}
        className="px-6 py-3 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function shrinkCover(url) {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    if (u.hostname.includes('books.google')) {
      u.searchParams.set('img', '1');
      u.searchParams.set('zoom', '1'); // smaller
      u.protocol = 'https:';
      return u.toString();
    }
    if (u.hostname.includes('covers.openlibrary.org')) {
      return u.toString().replace(/-L\.(jpg|png)$/i, '-M.$1');
    }
  } catch {}
  return url;
}
