import { FC } from 'react';
import { motion } from 'framer-motion';

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
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
      <div className="w-full space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 bg-neutral-100 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-neutral-50">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-4 py-2 text-left text-sm font-medium text-neutral-700"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <motion.tr
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onRowClick?.(item)}
              className={`
                border-b border-neutral-100
                ${onRowClick ? 'cursor-pointer hover:bg-neutral-50' : ''}
              `}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="px-4 py-2 text-sm text-neutral-700"
                >
                  {column.render
                    ? column.render(item[column.key], item)
                    : String(item[column.key])}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          No data to display
        </div>
      )}
    </div>
  );
};
