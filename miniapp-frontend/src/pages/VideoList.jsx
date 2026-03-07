import { ArrowLeft, Heart, MessageCircle, Share2, Play } from 'lucide-react';
import { getVideosForTopic } from '../data/mockData';

export default function VideoList({ topic, onBack, onSelectVideo }) {
  const videoList = getVideosForTopic(topic.id);

  const fmt = (n) => {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  const fmtDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="page-scroll">
      <div className="page-nav">
        <div className="nav-back" onClick={onBack}>
          <ArrowLeft size={16} color="var(--text-primary)" />
        </div>
        <div className="nav-title">爆款视频</div>
      </div>

      <div style={{ padding: '0 20px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>{topic.keyword}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          发现 <span className="font-outfit" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{topic.videoCount}</span> 条10万+爆款 · 热度评分 {topic.heatScore}
        </div>
      </div>

      {videoList.map((video, i) => (
        <div
          key={video.id}
          className="animate-in"
          style={{
            margin: '0 20px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer',
            transition: 'all 0.3s', animationDelay: `${i * 0.08}s`,
          }}
          onClick={() => onSelectVideo(video)}
        >
          {/* Thumbnail */}
          <div style={{
            width: '100%', height: 180, background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(135deg, ${video.coverColor || '#1a1030'} 0%, #0d1525 50%, #15102a 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {/* Pattern overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'linear-gradient(45deg, transparent 48%, rgba(124,58,237,0.08) 50%, transparent 52%), linear-gradient(-45deg, transparent 48%, rgba(6,182,212,0.05) 50%, transparent 52%)',
                backgroundSize: '20px 20px',
              }} />
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid rgba(255,255,255,0.2)', position: 'relative', zIndex: 1,
              }}>
                <Play size={20} color="white" fill="white" style={{ marginLeft: 2 }} />
              </div>
            </div>
            <div style={{
              position: 'absolute', top: 8, left: 8, background: 'rgba(6,182,212,0.2)',
              border: '1px solid rgba(6,182,212,0.3)', padding: '2px 8px', borderRadius: 4,
              fontSize: 10, fontWeight: 700, color: 'var(--accent-cyan)',
            }}>视频号</div>
            <div className="font-outfit" style={{
              position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.7)',
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
            }}>{fmtDuration(video.duration)}</div>
          </div>

          {/* Info */}
          <div style={{ padding: '14px 16px' }}>
            <div style={{
              fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 8,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{video.title}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: i % 2 === 0 ? 'var(--gradient-violet)' : 'var(--gradient-cyan)',
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{video.creator.name}</span>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <Heart size={14} color="var(--accent-rose)" fill="var(--accent-rose)" />
                <span className="font-outfit" style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>{fmt(video.likes)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                <MessageCircle size={14} />
                <span className="font-outfit" style={{ fontWeight: 600 }}>{fmt(video.comments)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                <Share2 size={14} />
                <span className="font-outfit" style={{ fontWeight: 600 }}>{fmt(video.shares)}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{video.daysAgo}天前</span>
            </div>
          </div>
        </div>
      ))}
      <div style={{ height: 20 }} />
    </div>
  );
}
