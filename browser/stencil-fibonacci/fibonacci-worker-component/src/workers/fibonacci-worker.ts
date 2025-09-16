/**
 * Fibonacci Web Worker
 * Efficiently computes Fibonacci numbers in a separate thread
 */

// Interface for worker messages
interface FibonacciMessage {
  type: 'CALCULATE_FIBONACCI';
  value: number;
}

interface FibonacciResult {
  type: 'FIBONACCI_RESULT';
  input: number;
  result: string;
  calculationTime: number;
}

// Efficient Fibonacci calculation using memoization
const fibonacciCache = new Map<number, bigint>();

function calculateFibonacci(n: number): bigint {
  if (n <= 0) return BigInt(0);
  if (n === 1) return BigInt(1);
  
  // Check cache first
  if (fibonacciCache.has(n)) {
    return fibonacciCache.get(n)!;
  }
  
  // For large numbers, use iterative approach to avoid stack overflow
  if (n > 50) {
    let a = BigInt(0);
    let b = BigInt(1);
    
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
      
      // Cache intermediate values for future use
      if (!fibonacciCache.has(i)) {
        fibonacciCache.set(i, b);
      }
    }
    
    return b;
  }
  
  // For smaller numbers, use recursive approach with memoization
  const result = calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
  fibonacciCache.set(n, result);
  return result;
}

// Listen for messages from the main thread
self.addEventListener('message', (event: MessageEvent<FibonacciMessage>) => {
  const { type, value } = event.data;
  
  if (type === 'CALCULATE_FIBONACCI') {
    const startTime = performance.now();
    
    try {
      const result = calculateFibonacci(value);
      const endTime = performance.now();
      const calculationTime = endTime - startTime;
      
      const response: FibonacciResult = {
        type: 'FIBONACCI_RESULT',
        input: value,
        result: result.toString(),
        calculationTime: Math.round(calculationTime * 100) / 100 // Round to 2 decimal places
      };
      
      self.postMessage(response);
    } catch (error) {
      self.postMessage({
        type: 'FIBONACCI_ERROR',
        input: value,
        error: error.message || 'Unknown error occurred'
      });
    }
  }
});

// Export type for use in the component
export type { FibonacciMessage, FibonacciResult };