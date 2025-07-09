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
      <div className="w-full space-y-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-14 bg-gray-100 rounded-md animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-lg shadow-md">
      <div>
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${column.className}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onRowClick?.(item)}
                className={`
                  ${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  }
                  transition-colors duration-200
                `}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-6 py-4 text-sm text-gray-800 align-top ${column.className}`}
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
      </div>

      {data.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No data to display</p>
          <p className="mt-1 text-sm">
            There are no transactions to show at the moment.
          </p>
        </div>
      )}
    </div>
  );
};
