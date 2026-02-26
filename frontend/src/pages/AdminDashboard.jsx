import React, { useState, useEffect } from 'react';
import { Users, Activity, CreditCard, ShieldAlert, Search, Filter, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const AdminDashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);

    const mockSystemStats = [
        { label: "Total Users", value: "2,842", change: "+145 this week", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Active Pro Subs", value: "840", change: "+22 this week", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "AI Jobs Processed", value: "124.5k", change: "99.8% Success", icon: Activity, color: "text-purple-600", bg: "bg-purple-50" },
        { label: "System Alerts", value: "3", change: "Needs review", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" }
    ];

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                const fetchedUsers = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    let joinedDate = 'Just now';
                    if (data.joined?.toDate) {
                        joinedDate = data.joined.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    }
                    return {
                        id: doc.id.substring(0, 8),
                        name: data.name || 'Unknown',
                        email: data.email || 'No email',
                        plan: data.plan || 'Free',
                        status: data.status || 'Active',
                        role: data.role || 'User',
                        joined: joinedDate
                    };
                });
                // Fallback to mock data if Firestore is empty so the table isn't completely blank
                if (fetchedUsers.length === 0) {
                    setUsersList([
                        { id: 'USR-294', name: 'Alfan Alam', email: 'admin@printguard.ai', plan: 'Enterprise', status: 'Active', role: 'Admin', joined: 'Jan 12, 2024' },
                        { id: 'USR-831', name: 'Sarah Jenkins', email: 'sarah.j@designco.com', plan: 'Pro', status: 'Active', role: 'User', joined: 'Feb 03, 2024' }
                    ]);
                } else {
                    setUsersList(fetchedUsers);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
                setUsersList([]);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const filteredUsers = usersList.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-navy-900 mb-2">Platform Administration</h1>
                <p className="text-slate-500">Monitor system health, manage users, and review financial metrics.</p>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {mockSystemStats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 ${stat.bg} ${stat.color} rounded-xl`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-navy-900 mb-1">{stat.value}</h3>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                            <span className="text-xs font-semibold text-slate-400">{stat.change}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-navy-900">User Management</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search users by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-full sm:w-72"
                            />
                        </div>
                        <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors tooltip" title="Filter">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">User Details</th>
                                <th className="px-6 py-4">Status & Role</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Joined Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border border-slate-300 shrink-0">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-navy-900">{user.name}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                    {user.status}
                                                </span>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${user.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-semibold ${user.plan === 'Enterprise' ? 'text-indigo-600' : user.plan === 'Pro' ? 'text-cyan-600' : 'text-slate-500'}`}>
                                                {user.plan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium">{user.joined}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                <button className="p-1.5 text-slate-400 hover:text-navy-600 hover:bg-slate-100 rounded transition-colors"><MoreVertical className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
