import { useState, useEffect } from 'react';
import { Search, RefreshCw, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuditLog {
    zoneId: string;
    timestamp: string;
    violation: boolean;
    message: string;
    personCount: number;
    details: string[];
}

export default function AdminPanel() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const { getToken } = useAuth();
    const API_URL = `${import.meta.env.VITE_API_URL}/logs`;

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const token = await getToken();
            const headers: HeadersInit = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['Authorization'] = token;
            }

            const response = await fetch(API_URL, { headers });
            if (!response.ok) throw new Error('Failed to fetch logs');
            const data = await response.json();
            setLogs(data);
            setLastRefreshed(new Date());
        } catch (error) {
            console.error("Error fetching logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.zoneId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const violationCount = logs.filter(l => l.violation).length;
    const compliantCount = logs.filter(l => !l.violation).length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Activity className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{logs.length}</div>
                            <div className="text-xs text-zinc-500">Total Scans</div>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{violationCount}</div>
                            <div className="text-xs text-zinc-500">Violations Detected</div>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{compliantCount}</div>
                            <div className="text-xs text-zinc-500">Compliant Scans</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Log Table */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-white">Safety Audit Logs</h2>
                        <button
                            onClick={fetchLogs}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                            title="Refresh Logs"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-black/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-zinc-400 font-medium">
                            <tr>
                                <th className="px-6 py-3">Timestamp</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Message</th>
                                <th className="px-6 py-3">Zone</th>
                                <th className="px-6 py-3 text-right">People</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                                        Loading audit data...
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log, index) => (
                                <tr key={index} className="group hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-zinc-400 font-mono text-xs">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${log.violation
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            }`}>
                                            {log.violation ? (
                                                <>
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Violation
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-3 h-3" />
                                                    Compliant
                                                </>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-white">
                                        {log.message}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500">
                                        {log.zoneId}
                                    </td>
                                    <td className="px-6 py-4 text-right text-zinc-400">
                                        {log.personCount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!isLoading && logs.length === 0 && (
                        <div className="p-8 text-center text-zinc-500">
                            No logs found. Run a scan to generate data.
                        </div>
                    )}
                </div>
            </div>
            <div className="text-right text-xs text-zinc-600">
                Last synced: {lastRefreshed.toLocaleTimeString()}
            </div>
        </div>
    );
}
