import ChatWrapper from '@/components/chat/ChatWrapper';

export default function Home() {
  return (
    <main className="page-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
      <ChatWrapper />
    </main>
  );
}
