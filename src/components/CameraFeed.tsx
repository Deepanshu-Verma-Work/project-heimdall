import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { AlertTriangle, Loader2, WifiOff } from 'lucide-react';

interface CameraFeedProps {
    onAnalysisComplete?: (data: any) => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ onAnalysisComplete }) => {
    const webcamRef = useRef<Webcam>(null);
    const [violation, setViolation] = useState<boolean | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [apiStatus, setApiStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // API Endpoint (Direct Lambda URL for Production)
    const API_URL = "https://e6hmc62rl6spkf4dzpxe7ifgd40kdpgi.lambda-url.us-east-1.on.aws/";

    useEffect(() => {
        // Check for Secure Context (HTTPS)
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
            setCameraError("Camera access requires HTTPS. Please deploy via AWS Amplify or CloudFront.");
        }

        // Initial Backend Health Check
        const checkBackendHealth = async () => {
            try {
                console.log("Pinging backend...");
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "ping" }),
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log("Backend Health Check:", data);
                    // Don't set status to 'success' yet, wait for first analysis
                } else {
                    console.error("Backend Health Check Failed:", response.status);
                    setApiStatus('error');
                    setErrorMessage(`Backend Unreachable (HTTP ${response.status})`);
                }
            } catch (error) {
                console.error("Backend Health Check Error:", error);
                setApiStatus('error');
                if (error instanceof Error) {
                    setErrorMessage(`Connection Failed: ${error.message}`);
                }
            }
        };

        checkBackendHealth();
    }, []);

    const captureAndAnalyze = async () => {
        if (webcamRef.current && !cameraError) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;

            setApiStatus('analyzing');
            setErrorMessage(null);

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ image: imageSrc }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }

                const data = await response.json();
                console.log("Analysis Result:", data);

                setApiStatus('success');
                setViolation(data.violation);

                if (onAnalysisComplete) {
                    onAnalysisComplete(data);
                }

            } catch (error) {
                console.error("Analysis Failed:", error);
                setApiStatus('error');
                if (error instanceof Error) {
                    setErrorMessage(error.message);
                } else {
                    setErrorMessage("Unknown API Error");
                }
            }
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            captureAndAnalyze();
        }, 3000); // Analyze every 3 seconds

        return () => clearInterval(interval);
    }, [onAnalysisComplete, cameraError]);

    return (
        <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-black">
            {/* Webcam Feed */}
            {!cameraError && (
                <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                        width: 640,
                        height: 480,
                        facingMode: "user"
                    }}
                    className="w-full h-full object-cover"
                    onUserMediaError={(err) => {
                        console.error("Webcam Error:", err);
                        setCameraError("Camera access denied. Please check permissions.");
                    }}
                />
            )}

            {/* Error Overlay (Camera) */}
            {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-50 p-6 text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
                    <p className="text-slate-300 mb-4">{cameraError}</p>
                    <div className="text-xs text-slate-500 bg-slate-800 p-3 rounded border border-slate-700">
                        Browser Security blocks camera access on HTTP.<br />
                        Use <strong>AWS Amplify</strong> for free HTTPS hosting.
                    </div>
                </div>
            )}

            {/* Overlay UI (Only show if no camera error) */}
            {!cameraError && (
                <div className="absolute inset-0 pointer-events-none">
                    {/* Scanning Line Animation */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-scan opacity-50"></div>

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full border border-white/10 transition-all duration-300">
                        {apiStatus === 'analyzing' && <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />}
                        {apiStatus === 'success' && <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>}
                        {apiStatus === 'error' && <WifiOff className="w-3 h-3 text-red-500" />}

                        <span className={`text-xs font-mono ${apiStatus === 'error' ? 'text-red-400' :
                            apiStatus === 'analyzing' ? 'text-yellow-400' : 'text-cyan-400'
                            }`}>
                            {apiStatus === 'idle' && 'READY'}
                            {apiStatus === 'analyzing' && 'ANALYZING...'}
                            {apiStatus === 'success' && 'LIVE • REKOGNITION ACTIVE'}
                            {apiStatus === 'error' && 'CONNECTION ERROR'}
                        </span>
                    </div>

                    {/* API Error Message Toast */}
                    {apiStatus === 'error' && errorMessage && (
                        <div className="absolute top-16 left-4 bg-red-900/90 text-white text-xs p-2 rounded border border-red-500 max-w-xs break-words">
                            <strong>Backend Error:</strong> {errorMessage}
                        </div>
                    )}

                    {/* Detection Box */}
                    {violation !== null && apiStatus === 'success' && (
                        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 rounded-lg flex flex-col items-center justify-end pb-4 transition-colors duration-300 ${violation ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10'}`}>
                            <div className={`px-3 py-1 rounded text-sm font-bold ${violation ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                                {violation ? 'VIOLATION DETECTED' : 'COMPLIANT'}
                            </div>
                            {violation && <span className="text-xs text-red-200 mt-1">NO HELMET</span>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CameraFeed;
