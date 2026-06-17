import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import SEOHead from '../components/SEOHead';
import { getFiles, deleteFile } from '../utils/db';

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { userEmail, userTier, isPro, proLicenseKey, accessToken, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // profile, security, billing, history
  const [stats, setStats] = useState({
    filesProcessed: 0,
    bytesSaved: '0 Bytes',
    successRate: '100%',
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [conversionHistory, setConversionHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Password fields
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passwordStatus, setPasswordStatus] = useState('');

  // Profile Edit fields (mocked)
  const [profileData, setProfileData] = useState({
    firstName: 'Tanvir',
    lastName: 'Alam',
    country: 'Bangladesh',
    timezone: 'Asia/Dhaka'
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const searchRef = useRef(null);

  const TABS = ['profile', 'security', 'billing', 'history'];

  useKeyboardShortcuts({
    '/': (e) => {
      e.preventDefault();
      setActiveTab('history');
      setTimeout(() => searchRef.current?.focus(), 0);
    },
    'Escape': (e) => {
      if (document.activeElement) {
        document.activeElement.blur();
      }
      setSearchQuery('');
      if (confirmDialog) {
        setConfirmDialog(null);
      }
    }
  });

  useEffect(() => {
    const loadHistoryData = async () => {
      try {
        const logs = await getFiles();
        
        const mapped = logs.map(item => {
          const ext = '.' + item.name.split('.').pop().toLowerCase();
          
          let icon = 'description';
          let color = 'text-primary bg-primary/10';

          if (ext === '.pdf') {
            icon = 'picture_as_pdf';
            color = 'text-primary bg-primary/10';
          } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
            icon = 'image';
            color = 'text-secondary bg-secondary/10';
          } else if (ext === '.docx' || ext === '.txt') {
            icon = 'edit_note';
            color = 'text-tertiary bg-tertiary/10';
          }

          return {
            id: item.id,
            name: item.name,
            size: formatSize(item.size),
            rawSize: item.size || 0,
            action: item.action,
            date: item.date,
            time: getRelativeTime(item.date),
            icon,
            color,
            blob: item.blob
          };
        });

        setRecentActivity(mapped);

        const totalBytes = logs.reduce((acc, curr) => acc + (curr.size || 0), 0);

        setStats({
          filesProcessed: logs.length,
          bytesSaved: formatSize(totalBytes),
          successRate: '100%',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadHistoryData();
  }, []);

  useEffect(() => {
    try {
      const historyRaw = localStorage.getItem('conversionHistory');
      if (historyRaw) {
        setConversionHistory(JSON.parse(historyRaw));
      }
    } catch (err) {
      console.error('Failed to load conversion history:', err);
    }
  }, []);

  const handleDeleteConversionHistoryItem = (id) => {
    try {
      const historyRaw = localStorage.getItem('conversionHistory');
      if (historyRaw) {
        let history = JSON.parse(historyRaw);
        history = history.filter(item => item.id !== id);
        localStorage.setItem('conversionHistory', JSON.stringify(history));
        setConversionHistory(history);
      }
    } catch (err) {
      console.error('Failed to delete conversion history item:', err);
    }
  };

  const getRelativeTime = (dateStr) => {
    try {
      const ms = new Date() - new Date(dateStr);
      const secs = Math.floor(ms / 1000);
      const mins = Math.floor(secs / 60);
      const hours = Math.floor(mins / 60);
      const days = Math.floor(hours / 24);

      if (secs < 60) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days === 1) return 'Yesterday';
      return `${days} days ago`;
    } catch {
      return 'Recently';
    }
  };

  const executeDeleteLog = async (id) => {
    try {
      await deleteFile(id);
      setRecentActivity(prev => prev.filter(item => item.id !== id));
      // recalculate stats
      const remaining = recentActivity.filter(item => item.id !== id);
      const totalBytes = remaining.reduce((acc, curr) => acc + curr.rawSize, 0);
      setStats({
        filesProcessed: remaining.length,
        bytesSaved: formatSize(totalBytes),
        successRate: '100%',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const triggerDeleteLog = (id) => {
    setConfirmDialog({
      title: 'Remove Log Entry',
      message: 'Are you sure you want to remove this log entry from your local history?',
      onConfirm: () => executeDeleteLog(id),
    });
  };

  const handleDownloadFile = (activity) => {
    if (!activity.blob) return;
    const url = URL.createObjectURL(activity.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activity.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const BACKEND_URL = 'http://localhost:8000';

  const executeDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to delete account. Please try again.');
      }

      logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account.');
      setDeleting(false);
    }
  };

  const triggerDeleteAccount = () => {
    setConfirmDialog({
      title: 'Delete Account Permanently',
      message: 'Are you absolutely sure you want to delete your account? This will permanently delete your profile, billing history, and all stored data. This action CANNOT be undone.',
      onConfirm: executeDeleteAccount,
    });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setPasswordStatus('Please fill in all fields.');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPasswordStatus('New passwords do not match.');
      return;
    }
    setPasswordStatus('Password updated successfully!');
    setPasswords({ current: '', new: '', confirm: '' });
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    setIsEditingProfile(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredActivity = recentActivity.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-background min-h-screen pt-24 pb-12 px-margin-mobile md:px-margin-desktop relative">
      <SEOHead title="User Dashboard — DocForge" description="Manage your DocForge profile, track local processing history, and view bytes saved." />
      <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>

      <div className="max-w-container-max mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-lg text-left">
        
        {/* Left Dashboard Sidebar */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[450px]">
            <div className="flex flex-col gap-6">
              {/* User Avatar Card */}
              <div className="flex items-center gap-3 pb-5 border-b border-outline-variant/60">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-[#FDBA74] flex items-center justify-center text-white font-bold text-lg select-none shadow-md ring-4 ring-primary/10">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'D'}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-on-background truncate max-w-[120px]">{profileData.firstName || userEmail.split('@')[0]}</h3>
                    {isPro ? (
                      <span className="bg-primary/10 border border-primary/30 text-primary font-label-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full">PRO</span>
                    ) : (
                      <span className="bg-outline-variant/30 border border-outline text-outline font-label-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full">FREE</span>
                    )}
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant truncate">{userEmail}</p>
                </div>
              </div>

              {/* Sidebar Menu Items */}
              <div className="flex flex-col gap-1">
                {[
                  { id: 'profile', label: 'Profile Settings', icon: 'person' },
                  { id: 'security', label: 'Security & Privacy', icon: 'security' },
                  { id: 'billing', label: 'Plans & Packages', icon: 'payments' },
                  { id: 'history', label: 'Activity Logs', icon: 'history' },
                ].map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-xs text-left ${
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 font-bold'
                          : 'text-on-surface-variant hover:text-on-background hover:bg-surface-container-low border border-transparent'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary fill' : 'text-outline'}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1 h-3 rounded bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-2 pt-5 border-t border-outline-variant/60">
              <Link
                to="/"
                className="w-full font-button text-xs bg-surface-container-low hover:bg-surface-container-high border border-outline-variant text-on-surface py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                Go to Workspace
              </Link>
              <button
                onClick={handleLogout}
                className="w-full font-button text-xs bg-transparent hover:bg-error/10 border border-outline-variant hover:border-error hover:text-error text-on-surface-variant py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Log Out
              </button>
            </div>
          </div>
        </div>

        {/* Right Dashboard Content Panel */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Active Tab: PROFILE */}
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-6 animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium select-none">
                <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/')}>Home</span>
                <span>/</span>
                <span className="hover:text-primary cursor-pointer" onClick={() => setActiveTab('profile')}>My account</span>
                <span>/</span>
                <span className="text-on-background font-semibold">Profile</span>
              </div>
              
              <h2 className="font-h2 text-xl font-bold text-on-background">Profile Settings</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Details Card */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center pb-4 border-b border-outline-variant/60 mb-5">
                      <h3 className="font-semibold text-on-background text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                        Profile
                      </h3>
                      {!isEditingProfile ? (
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Change
                        </button>
                      ) : (
                        <button 
                          onClick={() => setIsEditingProfile(false)}
                          className="text-xs font-bold text-on-surface-variant hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {!isEditingProfile ? (
                      <div className="flex flex-col gap-4 text-xs font-medium text-on-surface-variant">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-outline uppercase tracking-wider font-bold">First Name</span>
                          <span className="text-on-background text-sm font-semibold">{profileData.firstName || 'Tanvir'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Last Name</span>
                          <span className="text-on-background text-sm font-semibold">{profileData.lastName || '—'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Country</span>
                          <span className="text-on-background text-sm font-semibold flex items-center gap-1.5">
                            🇧🇩 {profileData.country || 'Bangladesh'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Timezone</span>
                          <span className="text-on-background text-sm font-semibold">{profileData.timezone || 'Asia/Dhaka'}</span>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleProfileSave} className="flex flex-col gap-4 text-xs">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-outline uppercase tracking-wider font-bold">First Name</label>
                          <input 
                            type="text" 
                            value={profileData.firstName}
                            onChange={e => setProfileData({...profileData, firstName: e.target.value})}
                            className="p-3 bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-background font-semibold"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-outline uppercase tracking-wider font-bold">Last Name</label>
                          <input 
                            type="text" 
                            value={profileData.lastName}
                            onChange={e => setProfileData({...profileData, lastName: e.target.value})}
                            className="p-3 bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-background font-semibold"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-outline uppercase tracking-wider font-bold">Country</label>
                          <input 
                            type="text" 
                            value={profileData.country}
                            onChange={e => setProfileData({...profileData, country: e.target.value})}
                            className="p-3 bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-background font-semibold"
                          />
                        </div>
                        <button type="submit" className="w-full bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-[#FDBA74] transition-colors mt-2 shadow-sm">
                          Save Changes
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Social Links Card */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center pb-4 border-b border-outline-variant/60 mb-5">
                      <h3 className="font-semibold text-on-background text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">share</span>
                        Social links
                      </h3>
                    </div>
                    
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-6 font-medium">
                      Connect your social accounts to log in through Facebook or Google.
                    </p>

                    <div className="flex flex-col gap-4">
                      {/* Google Connection Status */}
                      <div className="flex items-center justify-between p-3.5 bg-surface-container-low border border-outline-variant rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm bg-primary/10 text-primary w-7 h-7 rounded-full flex items-center justify-center font-bold">G</span>
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-on-background">Google Account</h4>
                            <p className="text-[10px] text-on-surface-variant truncate max-w-[150px]">{userEmail}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-success flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px] fill">check_circle</span>
                          Linked
                        </span>
                      </div>

                      {/* Facebook Button */}
                      <div className="flex items-center justify-between p-3.5 bg-surface-container-low border border-outline-variant rounded-xl opacity-60">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm bg-[#1877F2]/10 text-[#1877F2] w-7 h-7 rounded-full flex items-center justify-center font-bold">F</span>
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-on-background">Facebook</h4>
                            <p className="text-[10px] text-on-surface-variant">Not connected</p>
                          </div>
                        </div>
                        <button className="text-[10px] font-bold text-primary hover:underline">Link</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Card */}
              <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center pb-4 border-b border-outline-variant/60 mb-5">
                  <h3 className="font-semibold text-on-background text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
                    Email address
                  </h3>
                  <button className="text-xs font-bold text-primary hover:underline">Change</button>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-outline uppercase tracking-wider font-bold">Current email</span>
                  <span className="text-on-background text-sm font-semibold">{userEmail}</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: SECURITY */}
          {activeTab === 'security' && (
            <div className="flex flex-col gap-6 animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium select-none">
                <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/')}>Home</span>
                <span>/</span>
                <span className="hover:text-primary cursor-pointer" onClick={() => setActiveTab('profile')}>My account</span>
                <span>/</span>
                <span className="text-on-background font-semibold">Security</span>
              </div>
              
              <h2 className="font-h2 text-xl font-bold text-on-background">Security & Privacy</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Change Password Card */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm">
                  <div className="pb-4 border-b border-outline-variant/60 mb-5">
                    <h3 className="font-semibold text-on-background text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">key</span>
                      Change Password
                    </h3>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 text-xs">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-outline uppercase tracking-wider font-bold">Current Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={passwords.current}
                        onChange={e => setPasswords({...passwords, current: e.target.value})}
                        className="p-3 bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-background font-semibold"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-outline uppercase tracking-wider font-bold">New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={passwords.new}
                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                        className="p-3 bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-background font-semibold"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-outline uppercase tracking-wider font-bold">Confirm New Password</label>
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={passwords.confirm}
                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                        className="p-3 bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-background font-semibold"
                      />
                    </div>
                    
                    {passwordStatus && (
                      <p className={`text-xs font-semibold ${passwordStatus.includes('successfully') ? 'text-success' : 'text-error'}`}>
                        {passwordStatus}
                      </p>
                    )}

                    <button type="submit" className="w-full bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-primary-dark transition-colors mt-2 shadow-sm">
                      Update Password
                    </button>
                  </form>
                </div>

                {/* Active Sessions */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="pb-4 border-b border-outline-variant/60 mb-5">
                      <h3 className="font-semibold text-on-background text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">devices</span>
                        Active Sessions
                      </h3>
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed mb-6 font-medium">
                      Devices currently logged in with your DocForge account.
                    </p>

                    <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-3.5 p-3.5 bg-surface-container-low border border-outline-variant rounded-xl">
                        <span className="material-symbols-outlined text-primary text-[24px]">desktop_windows</span>
                        <div className="text-left flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-on-background flex items-center gap-1.5">
                            Chrome (Windows OS)
                            <span className="bg-success/15 border border-success/30 text-success text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider font-label-mono">Current</span>
                          </h4>
                          <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Dhaka, Bangladesh • IP: 103.145.74.22</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-surface border border-error/25 rounded-2xl p-6 shadow-sm">
                <div className="pb-4 border-b border-error/15 mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-[18px]">delete_forever</span>
                  <h3 className="font-semibold text-error text-sm">Danger Zone</h3>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-on-background mb-1">Delete Account</h4>
                    <p className="text-xs text-on-surface-variant max-w-xl font-medium leading-relaxed">
                      Permanently delete your profile, subscription data, billing reports, and local IndexedDB database records. This action cannot be reversed.
                    </p>
                  </div>
                  <button
                    onClick={triggerDeleteAccount}
                    disabled={deleting}
                    className="flex-shrink-0 px-5 py-3 border border-error/30 hover:border-error hover:bg-error/10 text-error rounded-xl text-xs font-bold bg-surface transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    {deleting ? 'Deleting Account...' : 'Delete Account'}
                  </button>
                </div>
                {deleteError && (
                  <p className="text-xs text-error font-semibold mt-3 text-left">{deleteError}</p>
                )}
              </div>
            </div>
          )}

          {/* Active Tab: BILLING */}
          {activeTab === 'billing' && (
            <div className="flex flex-col gap-6 animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium select-none">
                <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/')}>Home</span>
                <span>/</span>
                <span className="hover:text-primary cursor-pointer" onClick={() => setActiveTab('profile')}>My account</span>
                <span>/</span>
                <span className="text-on-background font-semibold">Plans & Packages</span>
              </div>
              
              <h2 className="font-h2 text-xl font-bold text-on-background">Plans & Packages</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Plan Card */}
                {isPro ? (
                  <div className="bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="pb-3 mb-4 flex items-center justify-between">
                        <span className="bg-primary/20 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-label-mono">Pro Active</span>
                        <span className="material-symbols-outlined text-primary text-[24px]">workspace_premium</span>
                      </div>
                      <h3 className="font-display-hero text-2xl font-bold text-on-background mb-2">DocForge Pro</h3>
                      <p className="text-xs text-on-surface-variant font-medium mb-6 leading-relaxed">
                        Unlimited batch processing queues, GPU Cloud acceleration, and desktop-grade local conversion engines are fully unlocked on your account.
                      </p>
                    </div>
                    <div className="text-xs font-medium text-on-surface-variant flex flex-col gap-2 pt-4 border-t border-outline-variant/60">
                      <div className="flex justify-between">
                        <span>License Key:</span>
                        <span className="font-mono font-bold text-on-background">{proLicenseKey || 'DF-PRO-LICENSE-ACTIVE'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="text-success font-bold">Lifetime Subscription</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface border border-[#F59E0B]/30 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-primary/5 rounded-bl-[80px] pointer-events-none"></div>
                    <div>
                      <div className="pb-3 mb-4 flex items-center justify-between">
                        <span className="bg-outline-variant/30 text-outline text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-label-mono">Free Plan</span>
                        <span className="material-symbols-outlined text-outline text-[22px]">account_circle</span>
                      </div>
                      <h3 className="font-semibold text-on-background text-lg mb-1.5">Free Tier</h3>
                      <p className="text-xs text-on-surface-variant font-medium mb-5 leading-relaxed">
                        Standard browser-bound conversions, limited to 5 files per queue.
                      </p>
                      
                      <ul className="text-xs text-on-surface-variant font-semibold flex flex-col gap-2.5 mb-6 text-left">
                        <li className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-success text-[16px] fill">check_circle</span>
                          Standard Local Converters
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-success text-[16px] fill">check_circle</span>
                          Smart Reformatter Editor
                        </li>
                        <li className="flex items-center gap-2 opacity-50">
                          <span className="material-symbols-outlined text-outline text-[16px]">close</span>
                          WASM GPU Cloud Speed Boost
                        </li>
                        <li className="flex items-center gap-2 opacity-50">
                          <span className="material-symbols-outlined text-outline text-[16px]">close</span>
                          Parallel Batch processing (Max 50 files)
                        </li>
                      </ul>
                    </div>
                    <Link
                      to="/pricing"
                      className="w-full bg-primary text-white py-3 rounded-xl hover:bg-[#FDBA74] active:bg-[#C2410C] font-button text-xs font-bold text-center transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px] fill">workspace_premium</span>
                      Upgrade to Pro
                    </Link>
                  </div>
                )}

                {/* Invoices List */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col justify-between text-left">
                  <div>
                    <div className="pb-4 border-b border-outline-variant/60 mb-5">
                      <h3 className="font-semibold text-on-background text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">receipt_long</span>
                        Invoices
                      </h3>
                    </div>

                    <div className="overflow-x-auto text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-outline-variant/60 text-outline uppercase font-label-mono text-[9px]">
                            <th className="py-2.5 font-bold">Invoice #</th>
                            <th className="py-2.5 font-bold">Date</th>
                            <th className="py-2.5 font-bold">Amount</th>
                            <th className="py-2.5 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold text-on-background">
                          {isPro ? (
                            <tr className="border-b border-outline-variant/30">
                              <td className="py-3 font-mono text-on-background">INV-2026-001</td>
                              <td className="py-3 text-on-surface-variant font-medium">Jun 15, 2026</td>
                              <td className="py-3">$10.00</td>
                              <td className="py-3 text-success font-bold">Paid</td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan="4" className="py-8 text-center text-on-surface-variant font-medium">No invoices found for this tier.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: HISTORY */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-6 animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium select-none">
                <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/')}>Home</span>
                <span>/</span>
                <span className="hover:text-primary cursor-pointer" onClick={() => setActiveTab('profile')}>My account</span>
                <span>/</span>
                <span className="text-on-background font-semibold">Activity Logs</span>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="font-h2 text-xl font-bold text-on-background">Activity & History</h2>
                
                {/* Search Log Bar */}
                <div className="relative w-full sm:w-[260px]">
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search logs by file name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 pl-8 pr-8 bg-surface-container border border-outline-variant rounded-xl text-on-background text-xs font-semibold focus:outline-none focus:border-primary transition-all shadow-inner"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px] select-none">
                    search
                  </span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-background flex items-center justify-center"
                      title="Clear search"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Stat 1 */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-1.5 text-left">
                  <span className="font-label-mono text-[9px] text-outline uppercase tracking-wider font-bold">Files Processed</span>
                  <div className="flex items-baseline gap-1 mt-auto">
                    <span className="font-display-hero text-3xl text-on-background font-bold">{stats.filesProcessed}</span>
                    <span className="text-[10px] text-on-surface-variant font-semibold">locally</span>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-1.5 text-left">
                  <span className="font-label-mono text-[9px] text-outline uppercase tracking-wider font-bold">Bytes Managed</span>
                  <div className="flex items-baseline gap-1 mt-auto">
                    <span className="font-display-hero text-3xl text-on-background font-bold">{stats.bytesSaved.split(' ')[0]}</span>
                    <span className="text-[10px] text-on-surface-variant font-semibold">{stats.bytesSaved.split(' ')[1] || 'Bytes'}</span>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-5 shadow-sm flex flex-col gap-1.5 text-left">
                  <span className="font-label-mono text-[9px] text-outline uppercase tracking-wider font-bold">Privacy Rating</span>
                  <div className="flex items-baseline gap-1 mt-auto text-primary">
                    <span className="font-display-hero text-3xl font-bold">100%</span>
                    <span className="text-[10px] text-on-surface-variant font-semibold">secure</span>
                  </div>
                </div>
              </div>

              {/* Recent History Logs */}
              <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-5 text-left">
                <div className="text-left pb-4 border-b border-outline-variant/60">
                  <h3 className="font-semibold text-on-background text-sm">Processed Timeline</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5 font-medium">Locally stored operations matching IndexedDB cache limits.</p>
                </div>

                {loading ? (
                  <p className="text-center text-on-surface-variant text-xs py-8 font-semibold">Loading history logs...</p>
                ) : filteredActivity.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {filteredActivity.map((activity, i) => (
                      <div
                        key={activity.id || i}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-surface-container-low border border-outline-variant rounded-xl gap-4 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 select-none ${activity.color}`}>
                            <span className="material-symbols-outlined text-[18px] fill">{activity.icon}</span>
                          </div>
                          <div className="min-w-0 text-left">
                            <h4 className="font-semibold text-xs text-on-background truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">{activity.name}</h4>
                            <p className="text-[10px] text-on-surface-variant font-semibold flex items-center gap-1.5 mt-0.5">
                              <span>{activity.action}</span>
                              <span>•</span>
                              <span>{activity.size}</span>
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                          <span className="font-label-mono text-[9px] text-outline uppercase font-semibold">{activity.time}</span>
                          <div className="flex items-center gap-1.5">
                            {activity.blob && (
                              <button 
                                onClick={() => handleDownloadFile(activity)}
                                className="p-2 border border-outline-variant hover:border-primary hover:text-primary rounded-lg transition-all bg-surface text-outline shadow-sm"
                                title="Download File"
                              >
                                <span className="material-symbols-outlined text-[14px]">download</span>
                              </button>
                            )}
                            <button 
                              onClick={() => triggerDeleteLog(activity.id)}
                              className="p-2 border border-outline-variant hover:border-error hover:text-error rounded-lg transition-all bg-surface text-outline shadow-sm"
                              title="Delete Log Entry"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-outline-variant rounded-xl bg-surface-container-low text-on-surface-variant">
                    <span className="material-symbols-outlined text-[28px] text-outline mb-1.5 select-none">history</span>
                    <p className="text-xs font-semibold text-on-background">No local activity logs found.</p>
                  </div>
                )}
              </div>

              {/* Conversion History Tracker */}
              <div className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-sm flex flex-col gap-5 text-left mt-6">
                <div className="text-left pb-4 border-b border-outline-variant/60">
                  <h3 className="font-semibold text-on-background text-sm">Conversion History Tracker</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5 font-medium">History of successful conversions across all tools.</p>
                </div>

                {conversionHistory.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {conversionHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-surface-container-low border border-outline-variant rounded-xl gap-4 text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 select-none text-primary bg-primary/10`}>
                            <span className="material-symbols-outlined text-[18px] fill">sync</span>
                          </div>
                          <div className="min-w-0 text-left">
                            <h4 className="font-semibold text-xs text-on-background truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">{item.filename}</h4>
                            <p className="text-[10px] text-on-surface-variant font-semibold flex items-center gap-1.5 mt-0.5">
                              <span>{item.toolName}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                          <span className="font-label-mono text-[9px] text-outline uppercase font-semibold">{getRelativeTime(item.timestamp)}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDeleteConversionHistoryItem(item.id)}
                              className="p-2 border border-outline-variant hover:border-error hover:text-error rounded-lg transition-all bg-surface text-outline shadow-sm"
                              title="Delete History Entry"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-outline-variant rounded-xl bg-surface-container-low text-on-surface-variant">
                    <span className="material-symbols-outlined text-[28px] text-outline mb-1.5 select-none">history</span>
                    <p className="text-xs font-semibold text-on-background">No conversion history found.</p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-6 select-none animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[24px]">warning</span>
              <h3 className="text-sm font-bold text-on-background">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end gap-2.5 mt-2">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low text-xs font-semibold text-on-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 rounded-lg bg-error text-white hover:bg-error-container/20 hover:text-error text-xs font-semibold transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
