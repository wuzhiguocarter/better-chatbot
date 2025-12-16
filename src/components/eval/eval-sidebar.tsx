"use client";

import { MailIcon, DatabaseIcon, User } from "lucide-react";

export function EvalSidebar() {
  return (
    <nav className="fixed left-0 top-0 h-full w-60 bg-[#0F172A] text-[#E2E8F0] flex flex-col border-r border-[#1E293B]">
      {/* Logo区 */}
      <div className="p-5 border-b border-[#1E293B]">
        <h1 className="text-xl font-serif font-bold tracking-wider">
          better-chatbot
        </h1>
      </div>

      {/* 菜单组 */}
      <div className="flex-1 py-6 px-3 space-y-1">
        <a
          href="/"
          className="flex items-center px-4 py-3 rounded-lg hover:bg-[#1E293B] transition-colors"
        >
          <MailIcon className="w-5 h-5 mr-3 text-[#94A3B8]" />
          <span>新聊天</span>
        </a>

        {/* 当前页高亮菜单 */}
        <a
          href="/eval"
          className="flex items-center px-4 py-3 rounded-lg bg-[#1E293B] border-l-4 border-[#10B981]"
        >
          <DatabaseIcon className="w-5 h-5 mr-3 text-[#10B981]" />
          <span>Eval Management</span>
        </a>

        <a
          href="/mcp"
          className="flex items-center px-4 py-3 rounded-lg hover:bg-[#1E293B] transition-colors"
        >
          <svg
            className="w-5 h-5 mr-3 text-[#94A3B8]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
          <span>MCP Configuration</span>
        </a>

        <a
          href="/workflow"
          className="flex items-center px-4 py-3 rounded-lg hover:bg-[#1E293B] transition-colors"
        >
          <svg
            className="w-5 h-5 mr-3 text-[#94A3B8]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>Workflow</span>
        </a>
      </div>

      {/* 用户信息区 */}
      <div className="p-4 border-t border-[#1E293B]">
        <div className="flex items-center space-x-3 group relative">
          <div className="w-10 h-10 rounded-full border-2 border-[#3B82F6] overflow-hidden bg-gray-600 flex items-center justify-center">
            <User className="w-6 h-6 text-gray-300" />
          </div>
          <span className="text-sm text-[#64748B] group-hover:text-[#E2E8F0] transition-colors truncate">
            z2533736852@gmail...
            {/* Tooltip */}
            <span className="absolute left-10 bottom-14 bg-[#0F172A] px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[#1E293B]">
              z2533736852@gmail.com
            </span>
          </span>
        </div>
      </div>
    </nav>
  );
}
