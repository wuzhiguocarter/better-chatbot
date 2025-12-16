"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Button } from "ui/button";
import { cn } from "lib/utils";
import { EvalFile } from "@/types/eval";
import {
  FileTextIcon,
  EyeIcon,
  PlayIcon,
  SquareIcon,
  TrashIcon,
} from "lucide-react";
import { format } from "date-fns";

interface EvalCardProps {
  file: EvalFile;
  onView: (id: string) => void;
  onAction: (id: string, action: string) => void;
  onDelete: (id: string) => void;
}

export function EvalCard({ file, onView, onAction, onDelete }: EvalCardProps) {
  const getStatusText = () => {
    switch (file.status) {
      case "pending":
        return "未启动";
      case "running":
        return "运行中";
      case "completed":
        return "已完成";
      default:
        return "未知";
    }
  };

  const getStatusBadgeClass = () => {
    switch (file.status) {
      case "pending":
        return "bg-secondary text-foreground";
      case "running":
        return "bg-blue-500 text-white";
      case "completed":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const statusText = getStatusText();

  return (
    <Card
      className={cn(
        "w-full min-h-[196px] @container transition-colors group flex flex-col gap-3 hover:bg-input",
      )}
      data-testid="eval-card"
      data-item-name={file.title}
      data-item-id={file.id}
    >
      <CardHeader className="shrink gap-y-0">
        <CardTitle className="flex gap-3 items-stretch min-w-0">
          {/* 文件图标 - 绿色渐变背景 */}
          <div
            style={{ backgroundColor: "#10b981" }}
            className="p-2 rounded-lg flex items-center justify-center ring ring-background border shrink-0"
          >
            <FileTextIcon className="text-white size-6" />
          </div>

          <div className="flex flex-col justify-around min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="truncate font-medium"
                data-testid="eval-card-title"
              >
                {file.title}
              </span>
              {/* 状态徽章 */}
              <span
                className={cn(
                  "px-2 rounded-sm text-xs shrink-0",
                  getStatusBadgeClass(),
                )}
              >
                {statusText}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
              <time className="shrink-0">
                {format(new Date(file.date), "MMM d, yyyy")}
              </time>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="min-h-0 grow">
        <CardDescription className="text-xs line-clamp-3 break-words overflow-hidden">
          {file.description || "暂无描述"}
        </CardDescription>
      </CardContent>

      <CardFooter className="shrink min-h-0 overflow-visible">
        <div className="flex items-center justify-between w-full min-w-0">
          <div className="flex items-center gap-2">
            {/* 查看 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onView(file.id);
              }}
              className="h-8 w-8"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>

            {/* 开始/停止 */}
            {file.status === "pending" || file.status === "completed" ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(file.id, "start");
                }}
                className="h-8 w-8"
              >
                <PlayIcon className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(file.id, "stop");
                }}
                className="h-8 w-8"
              >
                <SquareIcon className="h-4 w-4" />
              </Button>
            )}

            {/* 删除 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file.id);
              }}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
