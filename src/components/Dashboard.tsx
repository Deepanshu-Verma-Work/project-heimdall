import React, { useState, useCallback, useRef } from 'react';
import CameraFeed from './CameraFeed';
import { Shield, Activity, Users, AlertOctagon } from 'lucide-react';

interface LogEvent {
    id: number;
    type: 'violation' | 'routine' | 'compliant';
    message: string;
    timestamp: string;
}

const Dashboard: React.FC = () => {
    const [events, setEvents] = useState<LogEvent[]>([]);
    const [workerCount, setWorkerCount] = useState<number>(0);
    const [alertCount, setAlertCount] = useState<number>(0);

    // Use a ref to track the last status to avoid duplicate logs
    const lastStatusRef = useRef<'violation' | 'compliant' | null>(null);

    const handleAnalysisResult = useCallback((data: any) => {
        // Update Worker Count
        if (data.rekognition_raw?.Persons) {
            setWorkerCount(data.rekognition_raw.Persons.length);
        }

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const currentStatus = data.violation ? 'violation' : 'compliant';

        // Only log if status CHANGES
        if (lastStatusRef.current !== currentStatus) {
            lastStatusRef.current = currentStatus;

            // Status Changed! Log it.
            const message = currentStatus === 'violation'
                ? '⚠️ Safety Violation Detected: No Helmet'
                : '✅ Compliance Restored: Worker Safe';

            const newEvent: LogEvent = {
                id: Date.now(),
                type: currentStatus,
                message: message,
                timestamp: `Zone A • Cam 01 • ${timeString}`
            };
            setEvents(prev => [newEvent, ...prev].slice(0, 10)); // Keep last 10

            if (currentStatus === 'violation') {
                setAlertCount(prev => prev + 1);
            }
        }
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        <Shield className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Project Heimdall</h1>
                        <p className="text-slate-400 text-sm">Visual Safety Monitoring System</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <div className="text-2xl font-mono font-bold text-green-400">98.2%</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Compliance Rate</div>
                    </div>
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Camera Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-1">
                        <CameraFeed onAnalysisComplete={handleAnalysisResult} />
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                <Users className="w-4 h-4" />
                                <span className="text-xs font-semibold">WORKERS ON SITE</span>
                            </div>
                            <div className="text-2xl font-bold">{workerCount}</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                <Activity className="w-4 h-4" />
                                <span className="text-xs font-semibold">ACTIVE CAMS</span>
                            </div>
                            <div className="text-2xl font-bold">1</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-2 text-slate-400 mb-2">
                                <AlertOctagon className="w-4 h-4" />
                                <span className="text-xs font-semibold">ALERTS TODAY</span>
                            </div>
                            <div className="text-2xl font-bold text-red-400">{alertCount}</div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Activity Log */}
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 h-fit">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        Live Event Log
                    </h3>
                    <div className="space-y-4">
                        {events.length === 0 && <div className="text-slate-500 text-sm italic">Waiting for events...</div>}
                        {events.map((event) => (
                            <div key={event.id} className="flex gap-3 items-start p-3 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
                                <div className={`mt-1 w-2 h-2 rounded-full ${event.type === 'violation' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                <div>
                                    <div className="text-sm font-medium text-slate-200">
                                        {event.message}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">{event.timestamp}</div>
                                </div>
                            </div>
                        ))}
                    </div >
                </div >

            </div >
        </div >
    );
};

export default Dashboard;
