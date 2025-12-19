"use client";

import { useEffect, useMemo, useState } from "react";

import { SelectModel } from "@/components/select-model";
import { AgentToolSelector } from "@/components/agent/agent-tool-selector";
import { useAgent } from "@/hooks/queries/use-agent";
import { useAgents } from "@/hooks/queries/use-agents";
import { ChatMention, ChatModel } from "app-types/chat";
import { AgentSummary } from "app-types/agent";
import { cn } from "lib/utils";
import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Label } from "ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { Separator } from "ui/separator";
import { Skeleton } from "ui/skeleton";

interface EvalTaskConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  defaultModel?: ChatModel;
  defaultAgentId?: string;
  defaultMentions?: ChatMention[];
  onConfirm: (config: {
    model: ChatModel;
    agentId?: string;
    mentions: ChatMention[];
    toolChoice: "auto";
  }) => void;
}

function buildMentionsFromAgent(
  agent?: AgentSummary & { instructions?: { mentions?: ChatMention[] } },
) {
  if (!agent) return [] as ChatMention[];
  const mentions: ChatMention[] = [
    {
      type: "agent",
      name: agent.name,
      description: agent.description,
      agentId: agent.id,
      icon: agent.icon,
    },
  ];

  if (agent.instructions?.mentions?.length) {
    mentions.push(...agent.instructions.mentions);
  }

  return mentions;
}

export function EvalTaskConfigDialog({
  open,
  onOpenChange,
  threadId,
  defaultModel,
  defaultAgentId,
  defaultMentions,
  onConfirm,
}: EvalTaskConfigDialogProps) {
  const { agents, isLoading: isLoadingAgents } = useAgents({
    filters: ["all"],
  });
  const [model, setModel] = useState<ChatModel | undefined>(defaultModel);
  const [agentId, setAgentId] = useState<string | undefined>(defaultAgentId);
  const [mentions, setMentions] = useState<ChatMention[]>(
    defaultMentions ?? [],
  );

  const currentAgent = useMemo(() => {
    return agents.find((agent) => agent.id === agentId);
  }, [agentId, agents]);

  const { agent: detailedAgent, isLoading: isAgentLoading } = useAgent(
    agentId,
    {
      enabled: Boolean(agentId),
    },
  );

  useEffect(() => {
    if (open) {
      setModel((prev) => prev ?? defaultModel);
      setAgentId(defaultAgentId);
      setMentions(defaultMentions ?? []);
    }
  }, [defaultAgentId, defaultMentions, defaultModel, open, threadId]);

  useEffect(() => {
    if (!open) return;
    if (!agentId) {
      setMentions(defaultMentions ?? []);
      return;
    }
    const sourceMentions = buildMentionsFromAgent(
      detailedAgent ?? currentAgent,
    );
    setMentions(sourceMentions);
  }, [agentId, currentAgent, defaultMentions, detailedAgent, open]);

  const toolChoice = "auto" as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>评估配置</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>模型</Label>
            <div className="flex flex-wrap gap-2">
              <SelectModel
                currentModel={model}
                onSelect={(selected) => setModel(selected)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Agent</Label>
            {isLoadingAgents ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={agentId ?? "__none"}
                onValueChange={(value) =>
                  setAgentId(value === "__none" ? undefined : value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择 Agent (可选)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">不使用 Agent</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{agent.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {agent.description ?? ""}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>工具与提及</Label>
            <div className={cn("rounded-md")}>
              <AgentToolSelector
                mentions={mentions}
                isLoading={isAgentLoading}
                hasEditAccess
                onChange={setMentions}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>工具调用模式</Label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Auto</span>
              <span className="text-xs text-muted-foreground">(固定)</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => {
              if (!model) return;
              onConfirm({
                model,
                agentId,
                mentions,
                toolChoice,
              });
            }}
            disabled={!model}
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
