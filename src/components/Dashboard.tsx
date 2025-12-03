import React, { useState, useCallback, useRef } from 'react';
import CameraFeed from './CameraFeed';
import AdminPanel from './AdminPanel';
import { Shield, Activity, Users, AlertOctagon, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LogEvent {
    id: number;
    type: 'violation' | 'routine' | 'compliant';
    message: string;
    timestamp: string;
}

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');
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
            const message = data.message || (currentStatus === 'violation'
                ? '⚠️ Safety Violation Detected: No Helmet'
                : '✅ Compliance Restored: Worker Safe');

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

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30">
            {/* Top Navigation Bar */}
            <header className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <Shield className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white">HEIMDALL<span className="text-emerald-500">.AI</span></h1>
                            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Enterprise Safety Monitor</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* View Toggle (Admin Only) */}
                        {user?.role === 'admin' && (
                            <div className="hidden md:flex bg-white/5 rounded-lg p-1 border border-white/10">
                                <button
                                    onClick={() => setView('dashboard')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${view === 'dashboard' ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    <LayoutDashboard className="w-3 h-3" />
                                    Monitor
                                </button>
                                <button
                                    onClick={() => setView('admin')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${view === 'admin' ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    <Settings className="w-3 h-3" />
                                    Admin
                                </button>
                            </div>
                        )}

                        <div className="h-6 w-px bg-white/10 mx-2"></div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-medium text-white">{user?.name || 'Officer'}</div>
                                <div className="text-xs text-zinc-500 uppercase">{user?.role || 'Viewer'} Access</div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Admin Panel - Only show when view is 'admin' */}
                {view === 'admin' && <AdminPanel />}

                {/* Dashboard Content - Hide when view is 'admin', but keep mounted for CameraFeed */}
                <div style={view === 'admin' ? { position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -10 } : {}}>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-zinc-500 text-xs font-mono uppercase">Compliance Rate</span>
                                <Activity className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-bold text-white">98.2%</div>
                            <div className="text-xs text-emerald-500 mt-1">+2.4% vs last week</div>
                        </div>

                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-zinc-500 text-xs font-mono uppercase">Active Workers</span>
                                <Users className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="text-2xl font-bold text-white">{workerCount}</div>
                            <div className="text-xs text-zinc-500 mt-1">Zone A Monitoring</div>
                        </div>

                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-zinc-500 text-xs font-mono uppercase">Active Alerts</span>
                                <AlertOctagon className="w-4 h-4 text-red-500" />
                            </div>
                            <div className="text-2xl font-bold text-white">{alertCount}</div>
                            <div className="text-xs text-red-500 mt-1">Requires Attention</div>
                        </div>

                        <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-zinc-500 text-xs font-mono uppercase">System Status</span>
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            </div>
                            <div className="text-2xl font-bold text-white">Operational</div>
                            <div className="text-xs text-zinc-500 mt-1">Latency: 45ms</div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Camera Feed Section */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                    Live Feed - Zone A
                                </h2>
                                <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-white/5 rounded text-xs font-mono text-zinc-400">CAM-01</span>
                                    <span className="px-2 py-1 bg-white/5 rounded text-xs font-mono text-zinc-400">1080p</span>
                                </div>
                            </div>

                            <div className="bg-black rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative group">
                                {/* Corner Accents */}
                                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-emerald-500/50 rounded-tl-lg z-10"></div>
                                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-emerald-500/50 rounded-tr-lg z-10"></div>
                                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-emerald-500/50 rounded-bl-lg z-10"></div>
                                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-emerald-500/50 rounded-br-lg z-10"></div>

                                <CameraFeed onAnalysisComplete={handleAnalysisResult} />
                            </div>
                        </div>

                        {/* Activity Log Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">Event Log</h2>
                                <button className="text-xs text-emerald-500 hover:text-emerald-400">View All</button>
                            </div>

                            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4 h-[500px] overflow-y-auto backdrop-blur-sm custom-scrollbar">
                                {events.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                                        <Activity className="w-8 h-8 opacity-20" />
                                        <span className="text-sm">System monitoring active...</span>
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {events.map((event) => (
                                        <div key={event.id} className="group flex gap-3 items-start p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-all">
                                            <div className={`mt-1 p-1.5 rounded-full ${event.type === 'violation' ? 'bg-red-500/10 text-red-500' :
                                                event.type === 'compliant' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {event.type === 'violation' ? <AlertOctagon className="w-3.5 h-3.5" /> :
                                                    event.type === 'compliant' ? <Shield className="w-3.5 h-3.5" /> :
                                                        <Activity className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className={`text-sm font-medium ${event.type === 'violation' ? 'text-red-400' :
                                                        event.type === 'compliant' ? 'text-emerald-400' :
                                                            'text-zinc-300'
                                                        }`}>
                                                        {event.message}
                                                    </p>
                                                    <span className="text-[10px] text-zinc-600 font-mono">{event.timestamp.split('•')[2]}</span>
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-0.5">{event.timestamp.split('•')[0]} • {event.timestamp.split('•')[1]}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            {/* Debug Status Bar */}

        </div >
    );
};

export default Dashboard;
