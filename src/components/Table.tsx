import { FC } from 'react';
import { motion } from 'framer-motion';

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
}

export const Table = <T extends object>({
  data,
  columns,
  onRowClick,
  isLoading = false,
}: TableProps<T>) => {
  if (isLoading) {
    return (
      <div className="w-full space-y-3 p-6">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="h-16 bg-gradient-to-r from-white/40 to-gray-100/40 backdrop-blur-sm rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-visible">
      <table className="w-full table-fixed">
        <thead>
          <tr className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm border-b border-gray-200/50">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className={`px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider ${column.className}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100/50">
          {data.map((item, index) => (
            <motion.tr
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              onClick={() => onRowClick?.(item)}
              className={`
                ${onRowClick ? 'cursor-pointer hover:bg-white/60' : 'hover:bg-white/40'}
                backdrop-blur-sm transition-all duration-200 group relative
              `}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className={`px-6 py-4 text-sm text-gray-800 align-top transition-colors duration-200 ${column.className}`}
                >
                  <div className="break-word">
                    {column.render
                      ? column.render(item?.[column.key], item)
                      : String(item?.[column.key] || '')}
                  </div>
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && !isLoading && (
        <div className="text-center py-16 bg-white/30 backdrop-blur-sm rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📄</span>
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">No data to display</p>
          <p className="text-sm text-gray-500">
            There are no transactions to show at the moment.
          </p>
        </div>
      )}
    </div>
  );
};
