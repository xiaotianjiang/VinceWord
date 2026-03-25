'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CalculatorPage() {
  const [display, setDisplay] = useState('0');
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  // 处理数字输入
  const handleNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  // 处理运算符
  const handleOperator = (op: string) => {
    const inputValue = parseFloat(display);

    if (currentValue === null) {
      setCurrentValue(inputValue);
    } else if (operator) {
      const result = calculate(currentValue, inputValue, operator);
      setDisplay(result.toString());
      setCurrentValue(result);
    }

    setWaitingForOperand(true);
    setOperator(op);
  };

  // 计算结果
  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return b !== 0 ? a / b : 0;
      default:
        return b;
    }
  };

  // 处理等号
  const handleEquals = () => {
    if (operator && currentValue !== null) {
      const inputValue = parseFloat(display);
      const result = calculate(currentValue, inputValue, operator);
      setDisplay(result.toString());
      setCurrentValue(result);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  // 处理清除
  const handleClear = () => {
    setDisplay('0');
    setCurrentValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  // 处理小数点
  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">计算器</h1>
              <p className="text-gray-600">基本的数学计算工具</p>
            </div>
            <div className="flex space-x-2">
              <Link href="/tools">
                <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
                  返回工具列表
                </button>
              </Link>
              <Link href="/">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  返回主页
                </button>
              </Link>
            </div>
          </div>
        </header>

        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <div className="mb-4">
            <div className="bg-gray-100 rounded-md p-4 text-right">
              <p className="text-3xl font-mono">{display}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button 
              onClick={handleClear}
              className="col-span-2 px-4 py-3 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
            >
              C
            </button>
            <button 
              onClick={() => handleOperator('/')}
              className="px-4 py-3 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
            >
              ÷
            </button>
            <button 
              onClick={() => handleOperator('*')}
              className="px-4 py-3 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
            >
              ×
            </button>

            <button 
              onClick={() => handleNumber('7')}
              className="px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              7
            </button>
            <button 
              onClick={() => handleNumber('8')}
              className="px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              8
            </button>
            <button 
              onClick={() => handleNumber('9')}
              className="px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              9
            </button>
            <button 
              onClick={() => handleOperator('-')}
              className="px-4 py-3 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
            >
              -
            </button>

            <button 
              onClick={() => handleNumber('4')}
              className="px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              4
            </button>
            <button 
              onClick={() => handleNumber('5')}
              className="px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              5
            </button>
            <button 
              onClick={() => handleNumber('6')}
              className="px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              6
            </button>
            <button 
              onClick={() => handleOperator('+')}
              className="px-4 py-3 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
            >
              +
            </button>

            <button 
              onClick={() => handleNumber('1')}
              className="px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              1
            </button>
            <button 
              onClick={() => handleNumber('2')}
              className="px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              2
            </button>
            <button 
              onClick={() => handleNumber('3')}
              className="px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              3
            </button>
            <button 
              onClick={handleEquals}
              className="row-span-2 px-4 py-3 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
            >
              =
            </button>

            <button 
              onClick={() => handleNumber('0')}
              className="col-span-2 px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              0
            </button>
            <button 
              onClick={handleDecimal}
              className="px-4 py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
            >
              .
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
