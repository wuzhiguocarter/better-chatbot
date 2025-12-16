"use client";

import { useState } from "react";
import { FileTextIcon, CheckCircleIcon, Loader2 } from "lucide-react";
import { cn } from "lib/utils";
import { Button } from "ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "ui/dialog";

interface CreateEvalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEval: (title: string, description?: string) => void;
}

export function CreateEvalDialog({
  open,
  onOpenChange,
  onCreateEval,
}: CreateEvalDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setIsCreating(true);
    try {
      await onCreateEval(title.trim(), description.trim());
      setIsCreated(true);

      // Reset form after 2 seconds
      setTimeout(() => {
        setTitle("");
        setDescription("");
        setIsCreated(false);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to create evaluation:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating && !isCreated) {
      setTitle("");
      setDescription("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
              <FileTextIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-serif">
                新建评估任务
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                创建新的智能体评估任务，监控和优化服务质量
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                评估标题 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入评估任务标题..."
                className="w-full px-4 py-3 border border-border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                disabled={isCreating || isCreated}
                required
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                评估描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请输入评估任务的详细描述..."
                rows={4}
                className="w-full px-4 py-3 border border-border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-none"
                disabled={isCreating || isCreated}
              />
            </div>

            {/* Success Message */}
            {isCreated && (
              <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  评估任务创建成功！
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating || isCreated}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isCreating || isCreated}
              className={cn(isCreated && "bg-green-600 hover:bg-green-700")}
            >
              {isCreating ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>创建中...</span>
                </div>
              ) : isCreated ? (
                "创建成功"
              ) : (
                "立即创建"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
