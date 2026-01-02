

import React from 'react';

// FIX: Add 'size' prop to support different button sizes and resolve type errors.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', size = 'md', ...props }) => {
  const baseClasses = 'rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 focus:ring-indigo-500',
    secondary: 'bg-gray-700/80 backdrop-blur text-gray-100 hover:bg-gray-600/80 focus:ring-gray-500 border border-gray-600',
    ghost: 'bg-transparent text-gray-200 hover:bg-gray-700/50 focus:ring-gray-500',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 focus:ring-red-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input: React.FC<InputProps> = ({ label, id, className, ...props}) => (
    <div className="group">
        {label && <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2 group-focus-within:text-indigo-400 transition-colors">{label}</label>}
        <input id={id} className={`w-full bg-gray-800/50 backdrop-blur border border-gray-600 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:border-gray-500 ${className}`} {...props} />
    </div>
);

interface DateInputProps {
    label?: string;
    value: string; // YYYY-MM-DD format
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    className?: string;
}

export const DateInput: React.FC<DateInputProps> = ({ label, value, onChange, min, max, className }) => {
    const dateInputRef = React.useRef<HTMLInputElement>(null);
    
    // Convert YYYY-MM-DD to dd/mm/yyyy for display
    const formatDateForDisplay = (isoDate: string): string => {
        if (!isoDate) return '';
        const parts = isoDate.split('T')[0].split('-');
        if (parts.length !== 3) return isoDate;
        const [year, month, day] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    };
    
    const displayValue = formatDateForDisplay(value);
    
    return (
        <div className="group">
            {label && <label className="block text-sm font-medium text-gray-300 mb-2 group-focus-within:text-indigo-400 transition-colors">{label}</label>}
            <div className="relative">
                <input
                    type="text"
                    value={displayValue}
                    readOnly
                    onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
                    placeholder="dd/mm/yyyy"
                    className={`w-full bg-gray-800/50 backdrop-blur border border-gray-600 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer transition-all duration-200 hover:border-gray-500 ${className}`}
                />
                <input
                    ref={dateInputRef}
                    type="date"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    min={min}
                    max={max}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
            </div>
        </div>
    );
};


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-3xl leading-none hover:rotate-90 transform duration-300">&times;</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};


interface CardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

export const Card: React.FC<CardProps> = ({children, className, hover = false}) => (
    <div className={`bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-lg border border-gray-700/50 rounded-2xl p-6 shadow-xl ${hover ? 'hover:shadow-2xl hover:border-gray-600/50 hover:-translate-y-1 transition-all duration-300' : ''} ${className}`}>
        {children}
    </div>
);


export const Spinner: React.FC = () => (
    <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700"></div>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent absolute inset-0"></div>
    </div>
);