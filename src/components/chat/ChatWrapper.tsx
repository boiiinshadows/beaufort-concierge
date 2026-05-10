'use client';

import dynamic from 'next/dynamic';

const ChatInterface = dynamic(() => import('./ChatInterface'), {
  ssr: false,
  loading: () => (
    <div className="chat-widget chat-widget-desktop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Loading concierge…</div>
    </div>
  ),
});

export default function ChatWrapper() {
  return <ChatInterface />;
}
