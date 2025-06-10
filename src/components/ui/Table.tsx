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
    <div className={twMerge('w-full', className)}>
      {/* Mobile Card View - Show on small screens */}
      <div className="block sm:hidden space-y-4">
        {data.map((item, rowIndex) => (
          <div
            key={rowIndex}
            className={twMerge(
              'bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm',
              onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors' : ''
            )}
            onClick={() => onRowClick && onRowClick(item)}
          >
            {columns.map((column, colIndex) => {
              const value = column.render
                ? column.render(item)
                : (item as any)[column.key as string];
              
              return (
                <div key={colIndex} className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-1/3 flex-shrink-0">
                    {column.title}:
                  </span>
                  <span className="text-sm text-gray-900 dark:text-gray-200 w-2/3 text-right break-words">
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Desktop Table View - Show on larger screens */}
      <div className="hidden sm:block">
        {/* Horizontal scroll container */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-neutral-700">
                  <tr>
                    {columns.map((column, index) => (
                      <th
                        key={index}
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
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
                          className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 whitespace-nowrap"
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
          </div>
        </div>
      </div>

      {/* Mobile scroll hint */}
      <div className="block sm:hidden mt-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tap on any card to view more details
        </p>
      </div>
    </div>
  );
}

export default Table;