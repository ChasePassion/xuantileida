import { useState } from 'react';
import { Flame, Heart, LayoutGrid, ChevronRight } from 'lucide-react';
import { categories, topics, dailyStats } from '../data/mockData';

export default function TopicHome({ onSelectTopic }) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = activeCategory === 'all'
    ? topics
    : topics.filter(t => t.category === activeCategory);

  const formatLikes = (n) => {
    if (n >= 10000) return `${(n / 10000).toFixed(0)}`;
    return n.toString();
  };

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ padding: '4px 20px 16px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -44, left: 0, right: 0, height: 200, background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, position: 'relative' }}>
          今日 <span className="gradient-text">AI 选题</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)', animation: 'pulse 2s infinite' }} />
          已更新 {dailyStats.updateTime} · 发现 {dailyStats.viralCount} 条爆款
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px 16px' }}>
        {[
          { num: dailyStats.topicCount, label: '推荐选题', color: 'var(--accent-violet-light)' },
          { num: dailyStats.viralCount, label: '10万+爆款', color: 'var(--accent-cyan)' },
          { num: dailyStats.industryCount, label: '行业覆盖', color: 'var(--accent-orange)' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 10px', textAlign: 'center' }}>
            <div className="font-outfit" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: s.color }}>{s.num}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: activeCategory === cat.id ? 700 : 500,
              border: activeCategory === cat.id ? 'none' : '1px solid var(--border)',
              background: activeCategory === cat.id ? 'var(--gradient-violet)' : 'var(--bg-card)',
              color: activeCategory === cat.id ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
            }}
          >
            {cat.name}
            <span className="font-outfit" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
              fontSize: 10, fontWeight: 700,
              background: activeCategory === cat.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
              color: activeCategory === cat.id ? 'white' : 'var(--text-muted)',
            }}>{cat.count}</span>
          </button>
        ))}
      </div>

      {/* Topic Cards */}
      {filtered.map((topic, i) => (
        <div
          key={topic.id}
          onClick={() => onSelectTopic(topic)}
          className="animate-in"
          style={{
            margin: '0 20px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 16, cursor: 'pointer',
            transition: 'all 0.3s', animationDelay: `${i * 0.05}s`,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="font-outfit" style={{
              fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: 0.5,
              background: topic.rank <= 2 ? 'var(--gradient-fire)' : topic.rank <= 5 ? 'rgba(249,115,22,0.15)' : 'rgba(124,58,237,0.12)',
              color: topic.rank <= 2 ? 'white' : topic.rank <= 5 ? 'var(--accent-orange)' : 'var(--accent-violet-light)',
            }}>#{topic.rank}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Flame size={14} color="var(--accent-orange)" fill="var(--accent-orange)" />
              <span className="font-outfit" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-orange)' }}>{topic.heatScore}</span>
            </div>
          </div>

          {/* Keyword */}
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4, marginBottom: 6 }}>{topic.keyword}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{topic.reason}</div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                <LayoutGrid size={14} />
                <span className="font-outfit" style={{ fontWeight: 600 }}>{topic.videoCount}</span>条爆款
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                <Heart size={14} />
                最高 <span className="font-outfit" style={{ fontWeight: 600 }}>{formatLikes(topic.maxLikes)}</span>万赞
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-violet-light)', display: 'flex', alignItems: 'center', gap: 2 }}>
              查看 <ChevronRight size={14} />
            </div>
          </div>
        </div>
      ))}
      <div style={{ height: 20 }} />
    </div>
  );
}
