import React, { Fragment } from 'react';
import { Transition, Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  hideCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  hideCloseButton = false,
}) => {
  const getSizeClass = (): string => {
    switch (size) {
      case 'sm':
        return 'w-full max-w-sm mx-4 sm:mx-auto';
      case 'md':
        return 'w-full max-w-md mx-4 sm:mx-auto';
      case 'lg':
        return 'w-full max-w-lg mx-4 sm:mx-auto';
      case 'xl':
        return 'w-full max-w-xl mx-4 sm:mx-auto';
      case '2xl':
        return 'w-full max-w-2xl mx-4 sm:mx-auto';
      default:
        return 'w-full max-w-md mx-4 sm:mx-auto';
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`${getSizeClass()} transform overflow-hidden rounded-xl bg-white dark:bg-neutral-800 text-left align-middle shadow-2xl transition-all border border-gray-200 dark:border-gray-700`}
              >
                {title && (
                  <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-700/50">
                    <Dialog.Title
                      as="h3"
                      className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white pr-8"
                    >
                      {title}
                    </Dialog.Title>
                    {!hideCloseButton && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-neutral-600 absolute top-4 right-4"
                        aria-label="Close"
                      >
                        <X size={18} />
                      </Button>
                    )}
                  </div>
                )}
                <div className="px-4 sm:px-6 py-4 sm:py-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                  {children}
                </div>
                {footer && (
                  <div className="px-4 sm:px-6 py-4 bg-gray-50 dark:bg-neutral-700/50 border-t border-gray-200 dark:border-gray-700">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;