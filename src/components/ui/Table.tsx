import React from 'react';
import { twMerge } from 'tailwind-merge';
import { TableColumn } from '../../types';

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (item: T) => void;
  className?: string;
}

function Table<T>({
  data,
  columns,
  isLoading = false,
  emptyState,
  onRowClick,
  className,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full py-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full py-8 flex justify-center">
        {emptyState || (
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        )}
      </div>
    );
  }

  return (
    <div className={twMerge('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-neutral-700">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              className={twMerge(
                onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700' : '',
                'transition-colors'
              )}
              onClick={() => onRowClick && onRowClick(item)}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={colIndex}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200"
                >
                  {column.render
                    ? column.render(item)
                    : (item as any)[column.key as string]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;