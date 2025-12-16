"use client";

import { useState, useEffect } from "react";
import { EvalMainContent } from "./eval-main-content";
import { EvalFile } from "@/types/eval";

export function EvalPageClient() {
  const [files, setFiles] = useState<EvalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchFiles();
  }, [searchQuery, currentPage]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "9",
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/eval?${params}`);
      const data = await response.json();

      setFiles(data.files);
    } catch (error) {
      console.error("Failed to fetch evaluation files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEval = async (title: string, description?: string) => {
    try {
      const response = await fetch("/api/eval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, description }),
      });

      if (response.ok) {
        fetchFiles(); // Refresh the list
      }
    } catch (error) {
      console.error("Failed to create evaluation:", error);
    }
  };

  const handleFileAction = async (fileId: string, action: string) => {
    try {
      const response = await fetch(`/api/eval/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        fetchFiles(); // Refresh the list
      }
    } catch (error) {
      console.error("Failed to update file:", error);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/eval/${fileId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchFiles(); // Refresh the list
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  return (
    <EvalMainContent
      files={files}
      loading={loading}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      onCreateEval={handleCreateEval}
      onFileAction={handleFileAction}
      onDeleteFile={handleDeleteFile}
      onRefresh={fetchFiles}
    />
  );
}
