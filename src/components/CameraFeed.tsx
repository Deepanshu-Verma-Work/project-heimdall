import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { AlertTriangle } from 'lucide-react';

interface CameraFeedProps {
    onAnalysisComplete?: (data: any) => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ onAnalysisComplete }) => {
    const webcamRef = useRef<Webcam>(null);
    const [violation, setViolation] = useState<boolean | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // API Endpoint (Direct Lambda URL for Production)
    // Note: In a real app, use environment variables (import.meta.env.VITE_API_URL)
    const API_URL = "https://e6hmc62rl6spkf4dzpxe7ifgd40kdpgi.lambda-url.us-east-1.on.aws/";

    useEffect(() => {
        // Check for Secure Context (HTTPS)
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
            setCameraError("Camera access requires HTTPS. Please deploy via AWS Amplify or CloudFront.");
        }
    }, []);

    const captureAndAnalyze = async () => {
        if (webcamRef.current && !cameraError) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ image: imageSrc }),
                });

                const data = await response.json();
                console.log("Analysis Result:", data);

                // Update Local State
                setViolation(data.violation);

                // Notify Parent (Dashboard)
                if (onAnalysisComplete) {
                    onAnalysisComplete(data);
                }

            } catch (error) {
                console.error("Analysis Failed:", error);
                // Only show error if it's not a temporary network blip (optional refinement)
                // For now, let's log it to the UI so the user knows connectivity is the issue
                if (error instanceof Error) {
                    console.warn("Backend connectivity issue:", error.message);
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
                    className="w-full h-full object-cover"
                    onUserMediaError={(err) => {
                        console.error("Webcam Error:", err);
                        setCameraError("Camera access denied. Please check permissions.");
                    }}
                />
            )}

            {/* Error Overlay */}
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

            {/* Overlay UI (Only show if no error) */}
            {!cameraError && (
                <div className="absolute inset-0 pointer-events-none">
                    {/* Scanning Line Animation */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-scan opacity-50"></div>

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full border border-white/10">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-mono text-cyan-400">LIVE FEED • REKOGNITION ACTIVE</span>
                    </div>

                    {/* Detection Box */}
                    {violation !== null && (
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
