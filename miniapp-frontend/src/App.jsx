import { useState } from 'react';
import { FileText, Film, Video, User, Wifi, Battery } from 'lucide-react';
import TopicHome from './pages/TopicHome';
import VideoList from './pages/VideoList';
import AnalysisReport from './pages/AnalysisReport';
import CreateCenter from './pages/CreateCenter';
import Profile from './pages/Profile';

const TABS = [
  { id: 'topic', label: '选题', Icon: FileText },
  { id: 'analysis', label: '拆解', Icon: Film },
  { id: 'create', label: '创作', Icon: Video },
  { id: 'profile', label: '我的', Icon: User },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('topic');
  // Sub-page navigation stack
  const [subPage, setSubPage] = useState(null); // null | { type: 'videoList', topic } | { type: 'report', video }

  const handleSelectTopic = (topic) => {
    setSubPage({ type: 'videoList', topic });
  };

  const handleSelectVideo = (video) => {
    setSubPage({ type: 'report', video });
  };

  const handleBack = () => {
    if (subPage?.type === 'report') {
      // Go back to video list (need to remember the topic)
      setSubPage(prev => {
        if (prev?.parentTopic) return { type: 'videoList', topic: prev.parentTopic };
        return null;
      });
    } else {
      setSubPage(null);
    }
  };

  const handleSelectVideoFromList = (video) => {
    setSubPage(prev => ({
      type: 'report',
      video,
      parentTopic: prev?.topic,
    }));
  };

  const handleCreateFromTemplate = () => {
    setActiveTab('create');
    setSubPage(null);
  };

  const renderContent = () => {
    // Sub-pages take priority
    if (subPage?.type === 'report') {
      return (
        <AnalysisReport
          video={subPage.video}
          onBack={handleBack}
          onCreateFromTemplate={handleCreateFromTemplate}
        />
      );
    }
    if (subPage?.type === 'videoList') {
      return (
        <VideoList
          topic={subPage.topic}
          onBack={() => setSubPage(null)}
          onSelectVideo={handleSelectVideoFromList}
        />
      );
    }

    switch (activeTab) {
      case 'topic': return <TopicHome onSelectTopic={handleSelectTopic} />;
      case 'analysis': return (
        <div className="page-scroll">
          <AnalysisPlaceholder onGoToTopic={() => { setActiveTab('topic'); setSubPage(null); }} />
        </div>
      );
      case 'create': return <CreateCenter />;
      case 'profile': return <Profile />;
      default: return null;
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSubPage(null);
  };

  return (
    <div className="app-shell">
      {/* Status Bar */}
      <div className="status-bar">
        <span style={{ letterSpacing: 0.5 }}>9:41</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Wifi size={16} />
          <Battery size={16} />
        </div>
      </div>

      {/* Page Content */}
      {renderContent()}

      {/* Tab Bar */}
      <div className="tab-bar">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id && !subPage;
          return (
            <div
              key={tab.id}
              className={`tab-item ${isActive ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <tab.Icon size={22} />
              <span>{tab.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Placeholder for analysis tab when no video is selected
function AnalysisPlaceholder({ onGoToTopic }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: 40, textAlign: 'center',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: 'rgba(6,182,212,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      }}>
        <Film size={32} color="var(--accent-cyan)" />
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>还没有拆解报告</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
        从选题页面选择爆款视频，点击查看拆解报告
      </div>
      <button
        onClick={onGoToTopic}
        style={{
          padding: '12px 28px', background: 'var(--gradient-violet)', border: 'none',
          borderRadius: 'var(--radius-md)', color: 'white', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        去看今日选题
      </button>
    </div>
  );
}
