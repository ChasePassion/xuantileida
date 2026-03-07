import { Settings, Receipt, Download, Bell, UserCircle, MessageSquare, ChevronRight } from 'lucide-react';
import { userProfile } from '../data/mockData';

const menuItems = [
  { icon: Settings, label: '选题配置', color: 'rgba(124,58,237,0.12)' },
  { icon: Receipt, label: '消费明细', color: 'rgba(6,182,212,0.12)' },
  { icon: Download, label: '我的下载', color: 'rgba(249,115,22,0.12)' },
  { icon: Bell, label: '推送设置', color: 'rgba(244,63,94,0.12)' },
  { icon: UserCircle, label: '账号与安全', color: 'rgba(124,58,237,0.12)' },
  { icon: MessageSquare, label: '意见反馈', color: 'rgba(6,182,212,0.12)' },
];

export default function Profile() {
  return (
    <div className="page-scroll">
      {/* Profile Header */}
      <div style={{ padding: '16px 20px 24px', textAlign: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: -44, left: 0, right: 0, height: 200,
          background: 'radial-gradient(ellipse at 50% 20%, rgba(124,58,237,0.12) 0%, transparent 60%)', pointerEvents: 'none',
        }} />
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'var(--gradient-violet)',
          margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, position: 'relative',
          border: '3px solid var(--bg-deep)', boxShadow: '0 0 0 2px var(--accent-violet)',
        }}>{userProfile.name[0]}</div>
        <div style={{ fontSize: 18, fontWeight: 800, position: 'relative' }}>{userProfile.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, position: 'relative' }}>
          {userProfile.role} · {userProfile.plan}
        </div>
      </div>

      {/* Balance Card */}
      <div style={{
        margin: '0 20px 16px', background: 'linear-gradient(135deg, #1a1040 0%, #0e1a30 100%)',
        border: '1px solid rgba(124,58,237,0.2)', borderRadius: 'var(--radius-xl)',
        padding: 20, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -20, right: -20, width: 100, height: 100,
          borderRadius: '50%', background: 'rgba(124,58,237,0.15)', filter: 'blur(30px)',
        }} />
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, position: 'relative' }}>账户余额</div>
        <div className="font-outfit" style={{ fontSize: 32, fontWeight: 800, position: 'relative', marginBottom: 14 }}>
          <span style={{ fontSize: 16, color: 'var(--text-secondary)', marginRight: 4 }}>¥</span>
          {userProfile.balance.toFixed(2)}
        </div>
        <div style={{
          display: 'inline-block', padding: '8px 24px', background: 'var(--gradient-violet)',
          borderRadius: 20, fontSize: 13, fontWeight: 700, position: 'relative', cursor: 'pointer',
        }}>立即充值</div>
      </div>

      {/* Usage Stats */}
      <div style={{ display: 'flex', gap: 10, margin: '0 20px 20px' }}>
        {[
          { num: userProfile.stats.analyses, label: '本月拆解' },
          { num: userProfile.stats.generations, label: '本月生成' },
          { num: userProfile.stats.edits, label: '剪辑作品' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '14px 12px', textAlign: 'center',
          }}>
            <div className="font-outfit" style={{ fontSize: 20, fontWeight: 800 }}>{s.num}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu Items */}
      <div style={{ margin: '0 20px' }}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', padding: '16px 0', cursor: 'pointer',
              borderBottom: i < menuItems.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-sm)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginRight: 12, background: item.color,
              }}>
                <Icon size={16} color="var(--text-secondary)" />
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{item.label}</span>
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          );
        })}
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}
