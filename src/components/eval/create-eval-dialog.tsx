"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileTextIcon, CheckCircleIcon, Loader2 } from "lucide-react";
import { cn } from "lib/utils";
import { Button } from "ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "ui/dialog";
import { Label } from "ui/label";
import { toast } from "sonner";

interface CreateEvalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEval: (
    title: string,
    description: string,
    file: File | null,
  ) => Promise<void>;
}

export function CreateEvalDialog({
  open,
  onOpenChange,
  onCreateEval,
}: CreateEvalDialogProps) {
  const t = useTranslations("Eval");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }

    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(selected.type)) {
      toast.error("仅支持 CSV/Excel 文件");
      setFile(null);
      e.target.value = "";
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    setIsCreating(true);
    try {
      await onCreateEval(title.trim(), description.trim(), file);
      setIsCreated(true);

      // Reset form after 2 seconds
      setTimeout(() => {
        setTitle("");
        setDescription("");
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
                {t("createNewTask")}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {t("createTaskDescription")}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("createDialog.title")}{" "}
                <span className="text-destructive">
                  {t("createDialog.requiredIndicator")}
                </span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("createDialog.titlePlaceholder")}
                className="w-full px-4 py-3 border border-border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                disabled={isCreating || isCreated}
                required
              />
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("createDialog.description")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("createDialog.descriptionPlaceholder")}
                rows={4}
                className="w-full px-4 py-3 border border-border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-none"
                disabled={isCreating || isCreated}
              />
            </div>

            <div className="space-y-2">
              <Label>上传数据文件（CSV / Excel）</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreating || isCreated}
                >
                  选择文件
                </Button>
                {file && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {file.name} ({Math.round(file.size / 1024)} KB)
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
              />
            </div>

            {/* Success Message */}
            {isCreated && (
              <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  {t("createDialog.success")}
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
              {t("createDialog.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isCreating || isCreated}
              className={cn(isCreated && "bg-green-600 hover:bg-green-700")}
            >
              {isCreating ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("createDialog.creating")}</span>
                </div>
              ) : isCreated ? (
                t("createDialog.created")
              ) : (
                t("createDialog.createNow")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
