import { ArrowLeft, Share2, Sparkles } from 'lucide-react';
import { getAnalysisForVideo } from '../data/mockData';

const typeStyles = {
  hook: { bg: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)' },
  pain: { bg: 'rgba(249,115,22,0.15)', color: 'var(--accent-orange)' },
  core: { bg: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)' },
  climax: { bg: 'rgba(124,58,237,0.15)', color: 'var(--accent-violet-light)' },
  cta: { bg: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)' },
};

const barGradients = {
  violet: 'var(--gradient-violet)',
  cyan: 'var(--gradient-cyan)',
  fire: 'var(--gradient-fire)',
};

export default function AnalysisReport({ video, onBack, onCreateFromTemplate }) {
  const report = getAnalysisForVideo(video.id);
  if (!report) return null;

  const fmtLikes = (n) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toString();

  return (
    <div className="page-scroll">
      <div className="page-nav">
        <div className="nav-back" onClick={onBack}><ArrowLeft size={16} color="var(--text-primary)" /></div>
        <div className="nav-title">拆解报告</div>
      </div>

      {/* Score Ring */}
      <div style={{ padding: '0 20px 16px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -44, left: 0, right: 0, height: 160, background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 12px', position: 'relative',
          background: `conic-gradient(var(--accent-cyan) 0deg, var(--accent-violet) ${report.overallScore * 36}deg, var(--bg-card) ${report.overallScore * 36}deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-deep)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="font-outfit" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1 }}>{report.overallScore}</div>
            <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>爆款指数</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, marginBottom: 4, position: 'relative' }}>{report.title}</div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)', position: 'relative' }}>
          {fmtLikes(report.likes)}赞 · {report.platform} · {report.duration}秒
        </div>
      </div>

      {/* Dimension Scores */}
      <div style={{ margin: '0 20px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: 'rgba(6,182,212,0.15)' }}>★</span>
          爆款维度评分
        </div>
        {report.dimensions.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < report.dimensions.length - 1 ? 10 : 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 80, flexShrink: 0 }}>{d.label}</span>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${d.score * 10}%`, background: barGradients[d.color], transition: 'width 1s ease-out' }} />
            </div>
            <span className="font-outfit" style={{ fontSize: 13, fontWeight: 700, width: 28, textAlign: 'right' }}>{d.score}</span>
          </div>
        ))}
      </div>

      {/* Script Structure */}
      <div style={{ margin: '0 20px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, background: 'rgba(244,63,94,0.15)' }}>✎</span>
          文案结构拆解
        </div>
        {report.scriptStructure.map((step, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '10px 0',
            borderBottom: i < report.scriptStructure.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div className="font-outfit" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-violet-light)', width: 50, flexShrink: 0, paddingTop: 2 }}>{step.time}</div>
            <div style={{ flex: 1 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, display: 'inline-block', padding: '1px 6px', borderRadius: 3, marginBottom: 3,
                background: typeStyles[step.type]?.bg, color: typeStyles[step.type]?.color,
              }}>{step.label}</span>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>{step.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, padding: '16px 20px' }}>
        <button style={{
          flex: 1, padding: 14, borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 700,
          textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border)',
          background: 'var(--bg-card)', color: 'var(--text-primary)', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Share2 size={16} /> 分享报告
        </button>
        <button onClick={onCreateFromTemplate} style={{
          flex: 1, padding: 14, borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 700,
          textAlign: 'center', cursor: 'pointer', border: 'none',
          background: 'var(--gradient-violet)', color: 'white', fontFamily: 'inherit',
          boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Sparkles size={16} /> 基于此创作
        </button>
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}
