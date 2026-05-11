'use client';

// Calendly widget global injected via layout.tsx script
declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (opts: { url: string }) => void;
    };
  }
}

import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { useRef, useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

const QUICK_REPLIES: { label: string; value: string }[] = [];


// Phrase that signals the conversation is complete
const COMPLETION_PHRASES = [
  'member of our team will be in touch',
  'team will be in touch',
  'look forward to showing you',
];

const DEFAULT_GREETING = {
  id: 'greeting',
  role: 'assistant' as const,
  content: 'Welcome to Beaufort Properties. Are you looking for a home to live in, or exploring this as an investment?',
};

export default function ChatInterface() {
  const [sessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      // sessionStorage clears on tab close / page reload — fresh session every conversation
      const stored = sessionStorage.getItem('beaufort_session');
      if (stored) return stored;
      const id = crypto.randomUUID();
      sessionStorage.setItem('beaufort_session', id);
      return id;
    }
    return crypto.randomUUID();
  });

  const [greeting, setGreeting] = useState(DEFAULT_GREETING);
  const [input, setInput] = useState('');
  const [quickRepliesUsed, setQuickRepliesUsed] = useState(false);
  const [chatClosed, setChatClosed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Time-aware greeting on mount
  useEffect(() => {
    const hour = new Date().getHours();
    let salutation = 'Welcome';
    if (hour < 12) salutation = 'Good morning';
    else if (hour < 17) salutation = 'Good afternoon';
    else salutation = 'Good evening';

    setGreeting({
      id: 'greeting',
      role: 'assistant' as const,
      content: `${salutation}. I'm the Beaufort Concierge — here to help you find your perfect property in Accra.\n\nAre you looking for a home to live in, or exploring this as an investment?`,
    });
  }, []);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/chat',
        body: { sessionId },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId],
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const isLoading = status === 'submitted' || status === 'streaming';
  const isError = status === 'error';

  const extractText = (m: typeof messages[number] | typeof DEFAULT_GREETING): string => {
    let text = '';
    if ('parts' in m && m.parts) {
      text = (m.parts as Array<{ type: string; text?: string }>)
        .filter((p) => p.type === 'text')
        .map((p) => p.text ?? '')
        .join('');
    } else if ('content' in m && typeof m.content === 'string') {
      text = m.content;
    }

    // Clean up any bleeding XML or JSON tool calls from OpenRouter/Claude
    text = text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '');
    text = text.replace(/<function_calls>[\s\S]*?<\/function_calls>/g, '');
    text = text.replace(/```json[\s\S]*?```/g, '');
    
    // Also remove incomplete tool calls at the end of the stream
    text = text.replace(/<tool_call>[\s\S]*$/, '');
    text = text.replace(/<function_calls>[\s\S]*$/, '');
    
    return text.trim();
  };

  // Detect completion phrase in latest assistant message → lock chat
  useEffect(() => {
    if (chatClosed) return;
    const assistantMsgs = messages.filter((m) => m.role === 'assistant');
    if (assistantMsgs.length === 0) return;
    const lastText = extractText(assistantMsgs[assistantMsgs.length - 1]).toLowerCase();
    const isDone = COMPLETION_PHRASES.some((phrase) => lastText.includes(phrase));
    if (isDone && !isLoading) {
      // Small delay so user sees the final message before the UI changes
      setTimeout(() => setChatClosed(true), 1200);
    }
  }, [messages, isLoading, chatClosed]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const displayMessages = messages.length > 0 ? [greeting, ...messages] : [greeting];
  const showQuickReplies = messages.length === 0 && !quickRepliesUsed && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || chatClosed) return;
    setInput('');
    setQuickRepliesUsed(true);
    sendMessage({ text: trimmed });
  };

  const handleQuickReply = (value: string) => {
    if (chatClosed) return;
    setQuickRepliesUsed(true);
    sendMessage({ text: value });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="chat-widget chat-widget-desktop">

      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-avatar">B</div>
        <div>
          <div className="chat-header-title">Beaufort Concierge</div>
          <div className="chat-header-status">● Online</div>
        </div>
        <div className="chat-header-dot" />
      </div>

      {/* Messages */}
      <div className="chat-canvas">
        <div className="date-sep">Today</div>

        {displayMessages.map((m) => {
          const isUser = 'role' in m && m.role === 'user';
          const text = extractText(m);
          if (!text) return null;
          return (
            <div key={m.id} className={`bubble-row ${isUser ? 'user' : 'ai'}`}>
              <div className={`bubble ${isUser ? 'user' : 'ai'}`}>
                {isUser ? (
                  text
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: '0 0 0.5em 0' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ paddingLeft: '1.25rem', margin: '0.25em 0' }}>{children}</ul>,
                      li: ({ children }) => <li style={{ marginBottom: '0.2em' }}>{children}</li>,
                      strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#6ffbbe', textDecoration: 'underline' }}>
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {text}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          );
        })}

        {/* Quick reply chips — shown only before first user message */}
        {showQuickReplies && (
          <div className="quick-replies">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr.value}
                className="quick-reply-chip"
                onClick={() => handleQuickReply(qr.value)}
                disabled={isLoading}
              >
                {qr.label}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="bubble-row ai">
            <div className="bubble ai typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="bubble-row ai">
            <div className="bubble ai" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.12)' }}>
              I&apos;m having trouble connecting right now.
              <br />
              <button
                onClick={() => {
                  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                  if (lastUserMsg) {
                    const text = extractText(lastUserMsg);
                    if (text) sendMessage({ text });
                  }
                }}
                style={{
                  marginTop: '0.65rem',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area — locked after contact capture */}
      {chatClosed ? (
        <div className="chat-closed-bar">
          <span>✓ Our team will be in touch shortly</span>
          <button
            className="calendly-btn"
            onClick={() => {
              fetch('/api/bookings/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
              }).catch(console.error);

              window.Calendly?.initPopupWidget({
                url: 'https://calendly.com/mleslieyt/30min',
              });
            }}
          >
            📅 Book a Viewing
          </button>
        </div>
      ) : (
        <form className="chat-input-area" onSubmit={handleSubmit}>
          <div className="chat-input-row">
            <input
              id="chat-input"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your ideal space..."
              autoComplete="off"
              disabled={isLoading}
            />
            <button
              id="chat-send-btn"
              className="send-btn"
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
