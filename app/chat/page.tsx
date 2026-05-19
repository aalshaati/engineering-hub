"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    const history = [...messages, userMsg];
    setMessages([...history, assistantMsg]);
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        if (fullText.startsWith("__ERROR__:")) {
          throw new Error(fullText.replace("__ERROR__: ", ""));
        }

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: fullText };
          return updated;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || "Could not reach Claude. Check your API key in .env.local and restart the server.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-6 border-b border-border shrink-0">
        <p className="font-mono text-accent text-xs tracking-widest uppercase mb-2">
          AI Assistant
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Chat</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex justify-end">
            <div className="max-w-sm rounded-2xl rounded-tr-sm bg-zinc-800 px-4 py-3">
              <p className="text-sm leading-relaxed">
                Hey Abdulla! I&apos;m Claude. Ask me anything — code, hardware,
                AI concepts, or whatever you&apos;re working on.
              </p>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-sidebar border border-border rounded-tl-sm"
                  : "bg-zinc-800 rounded-tr-sm"
              }`}
            >
              {m.content}
              {m.role === "assistant" && isLoading && m.content === "" && (
                <span className="font-mono text-xs text-muted animate-pulse">
                  thinking...
                </span>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="flex justify-end">
            <div className="max-w-xl bg-red-950/40 border border-red-800/50 rounded-2xl px-4 py-3">
              <p className="font-mono text-xs text-red-400">{error}</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="px-8 py-5 border-t border-border shrink-0 flex gap-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Claude anything..."
          disabled={isLoading}
          className="flex-1 bg-sidebar border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-cyan-400/60 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-2.5 text-sm bg-cyan-400 text-black font-medium rounded-lg hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
