import { Skeleton } from "ui/skeleton";

export default function EvalDetailLoading() {
  return (
    <main className="flex-1 bg-zinc-900 min-h-screen text-zinc-100">
      <div className="w-full flex flex-col gap-4 p-8">
        {/* 头部骨架屏 */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-10 w-10 bg-zinc-800 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 bg-zinc-800" />
              <Skeleton className="h-4 w-4 bg-zinc-800" />
              <Skeleton className="h-4 w-12 bg-zinc-800" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-96 bg-zinc-800" />
            <Skeleton className="h-6 w-20 bg-zinc-800 rounded-full" />
            <div className="flex-1" />
            <Skeleton className="h-4 w-32 bg-zinc-800" />
          </div>
        </div>

        {/* 信息卡片骨架屏 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-2 bg-zinc-700" />
                  <Skeleton className="h-8 w-16 bg-zinc-700" />
                </div>
                <Skeleton className="h-14 w-14 rounded-xl bg-zinc-700" />
              </div>
            </div>
          ))}
        </div>

        {/* 结果表格骨架屏 */}
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-lg overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-2 h-6 bg-zinc-700 rounded-full" />
              <Skeleton className="h-6 w-48 bg-zinc-700" />
            </div>
          </div>

          <div className="relative overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-zinc-700 bg-zinc-800/30">
                  <th className="text-left py-4 px-6">
                    <Skeleton className="h-4 w-12 bg-zinc-700" />
                  </th>
                  <th className="text-left py-4 px-6">
                    <Skeleton className="h-4 w-20 bg-zinc-700" />
                  </th>
                  <th className="text-left py-4 px-6">
                    <Skeleton className="h-4 w-20 bg-zinc-700" />
                  </th>
                  <th className="text-right py-4 px-6">
                    <Skeleton className="h-4 w-24 bg-zinc-700" />
                  </th>
                  <th className="text-center py-4 px-6">
                    <Skeleton className="h-4 w-12 bg-zinc-700" />
                  </th>
                  <th className="text-right py-4 px-6">
                    <Skeleton className="h-4 w-16 bg-zinc-700" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-zinc-700/50 bg-zinc-900/40">
                    <td className="py-4 px-6">
                      <Skeleton className="h-6 w-8 bg-zinc-800 rounded-full" />
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-64 bg-zinc-800 mb-2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-16 bg-zinc-800 rounded" />
                        <Skeleton className="h-4 w-20 bg-zinc-800 rounded" />
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Skeleton className="h-4 w-48 bg-zinc-800" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Skeleton className="h-4 w-12 bg-zinc-800 ml-auto" />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Skeleton className="h-4 w-12 bg-zinc-800 mx-auto" />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Skeleton className="h-8 w-20 bg-zinc-800 ml-auto rounded" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
