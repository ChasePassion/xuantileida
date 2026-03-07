import { Sparkles, Scissors, ChevronRight, Video } from 'lucide-react';
import { recentWorks } from '../data/mockData';

export default function CreateCenter() {
  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ padding: '4px 20px 20px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: -44, left: 0, right: 0, height: 180, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 30% 0%, rgba(124,58,237,0.1) 0%, transparent 50%), radial-gradient(ellipse at 70% 0%, rgba(6,182,212,0.08) 0%, transparent 50%)',
        }} />
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, position: 'relative' }}>
          视频 <span className="gradient-text">创作中心</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, position: 'relative' }}>
          选择创作方式，开始你的爆款之旅
        </div>
      </div>

      {/* AI Generate Option */}
      <div style={{
        margin: '0 20px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, borderRadius: '50%', filter: 'blur(40px)', opacity: 0.15, background: 'var(--accent-violet)' }} />
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-md)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 24,
          background: 'rgba(124,58,237,0.15)',
        }}>
          <Sparkles size={24} color="var(--accent-violet-light)" />
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6, position: 'relative' }}>AI 智能生成</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, position: 'relative', paddingRight: 40 }}>
          选择爆款模板，上传素材，AI自动生成口播解说或图文卡点视频。3-5分钟出片。
        </div>
        <div style={{
          position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)',
          width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChevronRight size={14} color="var(--text-muted)" />
        </div>
      </div>

      {/* Editor Option */}
      <div style={{
        margin: '0 20px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: 20, cursor: 'pointer', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, borderRadius: '50%', filter: 'blur(40px)', opacity: 0.15, background: 'var(--accent-cyan)' }} />
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-md)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 24,
          background: 'rgba(6,182,212,0.15)',
        }}>
          <Scissors size={24} color="var(--accent-cyan)" />
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6, position: 'relative' }}>视频剪辑器</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, position: 'relative', paddingRight: 40 }}>
          基础剪辑功能：裁剪、拼接、加字幕、加BGM。可对AI生成的视频微调，也可从零创作。
        </div>
        <div style={{
          position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)',
          width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChevronRight size={14} color="var(--text-muted)" />
        </div>
      </div>

      {/* Recent Works */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>最近作品</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>查看全部</span>
        </div>
        {recentWorks.map((work) => (
          <div key={work.id} style={{
            display: 'flex', gap: 12, padding: '12px 0', alignItems: 'center',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)',
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Video size={20} color="var(--text-muted)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{work.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {work.type} {work.duration ? `· ${work.duration}秒` : ''} {work.time ? `· ${work.time}` : '· 生成中...'}
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
              background: work.status === 'done' ? 'rgba(16,185,129,0.12)' : 'rgba(249,115,22,0.12)',
              color: work.status === 'done' ? 'var(--accent-emerald)' : 'var(--accent-orange)',
            }}>
              {work.status === 'done' ? '已完成' : '生成中'}
            </span>
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}
