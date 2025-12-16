"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { Button } from "ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { EyeIcon } from "lucide-react";
import { EvaluationResultItem } from "@/types/eval/index";
import { cn } from "lib/utils";

interface EvalResultsTableProps {
  results: EvaluationResultItem[];
}

export function EvalResultsTable({ results }: EvalResultsTableProps) {
  const handleViewProcess = (resultId: string) => {
    // TODO: 实现查看过程的逻辑
    console.log("查看过程:", resultId);
  };

  return (
    <Card className="bg-zinc-800/50 backdrop-blur-sm border border-amber-500/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-serif text-amber-200 flex items-center gap-3">
          <div className="w-2 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
          评估结果详情
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <div className="rounded-lg overflow-hidden">
          <Table className="border-separate border-spacing-y-1">
            <TableHeader>
              <TableRow className="border-zinc-700 hover:bg-transparent bg-zinc-800/30">
                <TableHead className="text-amber-200 font-semibold py-4 px-6">
                  编号
                </TableHead>
                <TableHead className="text-amber-200 font-semibold py-4 px-6">
                  输入内容
                </TableHead>
                <TableHead className="text-amber-200 font-semibold py-4 px-6">
                  输出结果
                </TableHead>
                <TableHead className="text-amber-200 font-semibold py-4 px-6 text-right">
                  总延迟 (ms)
                </TableHead>
                <TableHead className="text-amber-200 font-semibold py-4 px-6 text-center">
                  状态
                </TableHead>
                <TableHead className="text-amber-200 font-semibold py-4 px-6 text-right">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {results.map((result, index) => (
                <TableRow
                  key={result.id}
                  className={cn(
                    "border-zinc-700/50 bg-zinc-900/40",
                    "hover:bg-amber-950/20 transition-all duration-200",
                    "hover:border-amber-500/20",
                  )}
                >
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs flex items-center justify-center font-mono">
                        {index + 1}
                      </span>
                      <span className="font-mono text-zinc-400 text-xs">
                        #{result.id}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="py-4 px-6">
                    <div className="max-w-md">
                      <p className="text-zinc-200 text-sm line-clamp-2">
                        {result.input}
                      </p>
                      {result.metrics && (
                        <div className="flex gap-2 mt-1">
                          {Object.entries(result.metrics)
                            .slice(0, 2)
                            .map(([key, value]) => (
                              <span
                                key={key}
                                className="text-xs px-2 py-1 bg-zinc-700/50 text-zinc-400 rounded"
                              >
                                {key}: {String(value)}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-4 px-6">
                    <div className="max-w-md">
                      <p className="text-zinc-300 text-xs line-clamp-2">
                        {result.actual_output}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-amber-300 font-mono font-semibold">
                        {result.execution_time}
                      </span>
                      <span className="text-amber-400/60 text-xs">ms</span>
                    </div>
                  </TableCell>

                  <TableCell className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center">
                      {result.success ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <div className="w-2 h-2 bg-green-400 rounded-full" />
                          <span className="text-xs">成功</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-400">
                          <div className="w-2 h-2 bg-red-400 rounded-full" />
                          <span className="text-xs">失败</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-4 px-6 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewProcess(result.id)}
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 transition-colors duration-200"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      查看过程
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-400">暂无评估结果</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
