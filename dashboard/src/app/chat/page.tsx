import { ChatInterface } from '@/components/ChatInterface';

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Chat</h1>
        <p className="mt-1 text-sm text-gray-500">Multi-agent control interface (Groq/Ollama compatible)</p>
      </div>
      <div className="flex-1 rounded-lg border border-gray-200 bg-white overflow-hidden" style={{ height: '70vh' }}>
        <ChatInterface />
      </div>
    </div>
  );
}
