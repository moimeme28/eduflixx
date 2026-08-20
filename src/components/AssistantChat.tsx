import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getThreadMessages } from "@/lib/assistant.functions";
import type { RecommendedTitle } from "@/lib/tmdb.server";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolHeader, ToolContent, ToolInput } from "@/components/ai-elements/tool";
import { Star } from "lucide-react";
import assistantAvatar from "@/assets/assistant-avatar.png";

export function AssistantChat({
  threadId,
  initialQuery,
}: {
  threadId: string;
  initialQuery?: string;
}) {
  const fetchMessages = useServerFn(getThreadMessages);
  const { data, isLoading } = useQuery({
    queryKey: ["assistant-messages", threadId],
    queryFn: () => fetchMessages({ data: { threadId } }),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading conversation…
      </div>
    );
  }

  return (
    <ChatWindow
      threadId={threadId}
      initialMessages={(data ?? []) as unknown as UIMessage[]}
      initialQuery={initialQuery}
    />
  );
}

function TitleGrid({ titles }: { titles: RecommendedTitle[] }) {
  if (!titles?.length) return null;
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {titles.map((t) => (
        <Link
          key={`${t.mediaType}-${t.id}`}
          to="/title/$type/$id"
          params={{ type: t.mediaType, id: String(t.id) }}
          className="group overflow-hidden rounded-lg border border-border bg-card/50 transition-colors hover:border-primary/50"
        >
          {t.poster && (
            <img src={t.poster} alt={t.title} loading="lazy" className="aspect-[2/3] w-full object-cover" />
          )}
          <div className="p-2">
            <p className="truncate text-xs font-medium">{t.title}</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {t.year}
              {t.rating > 0 && (
                <>
                  <Star className="h-3 w-3 fill-primary text-primary" /> {t.rating}
                </>
              )}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ChatWindow({
  threadId,
  initialMessages,
  initialQuery,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  initialQuery?: string;
}) {
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          return data.session
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {};
        },
        body: { threadId },
      }),
    [threadId],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "The assistant hit an error."),
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-threads"] });
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  // Auto-send an initial prompt (from suggestion chips) once.
  const sentInitial = useRef(false);
  useEffect(() => {
    if (initialQuery && !sentInitial.current && messages.length === 0) {
      sentInitial.current = true;
      sendMessage({ text: initialQuery });
    }
  }, [initialQuery, messages.length, sendMessage]);

  useEffect(() => {
    if (!isBusy) textareaRef.current?.focus();
  }, [isBusy, threadId]);

  function handleSubmit(message: PromptInputMessage) {
    if (!message.text?.trim() || isBusy) return;
    sendMessage({ text: message.text });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 && !isBusy && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <img src={assistantAvatar} alt="" width={64} height={64} className="h-16 w-16" loading="lazy" />
              <p className="text-sm text-muted-foreground">
                Ask about any subject and I'll find educational titles that teach it.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return <MessageResponse key={i}>{part.text}</MessageResponse>;
                  }
                  if (part.type === "tool-recommend_titles") {
                    const titles =
                      part.state === "output-available"
                        ? ((part.output as { titles?: RecommendedTitle[] })?.titles ?? [])
                        : [];
                    return (
                      <div key={i}>
                        <Tool>
                          <ToolHeader
                            type="tool-recommend_titles"
                            state={part.state}
                            title="Searching the EduFlix catalog"
                          />
                          <ToolContent>
                            <ToolInput input={part.input} />
                          </ToolContent>
                        </Tool>
                        <TitleGrid titles={titles} />
                      </div>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea ref={textareaRef} placeholder="What do you want to learn?" autoFocus />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={isBusy} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
