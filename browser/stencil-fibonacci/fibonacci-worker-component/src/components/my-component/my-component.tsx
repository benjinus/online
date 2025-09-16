import { Component, State, h, Method } from '@stencil/core';

interface FibonacciResult {
  input: number;
  result: string;
  calculationTime: number;
}

interface CalculationHistory {
  input: number;
  result: string;
  calculationTime: number;
  timestamp: string;
}

@Component({
  tag: 'fibonacci-calculator',
  styleUrl: 'my-component.css',
  shadow: true,
})
export class FibonacciCalculator {
  @State() inputValue: number = 10;
  @State() isCalculating: boolean = false;
  @State() currentResult: FibonacciResult | null = null;
  @State() error: string | null = null;
  @State() history: CalculationHistory[] = [];

  private worker: Worker | null = null;

  componentDidLoad() {
    this.initializeWorker();
  }

  disconnectedCallback() {
    if (this.worker) {
      this.worker.terminate();
    }
  }

  private initializeWorker() {
    try {
      // Create worker from inline code since we can't easily load external files
      const workerCode = `
        const fibonacciCache = new Map();

        function calculateFibonacci(n) {
          if (n <= 0) return BigInt(0);
          if (n === 1) return BigInt(1);
          
          if (fibonacciCache.has(n)) {
            return fibonacciCache.get(n);
          }
          
          if (n > 50) {
            let a = BigInt(0);
            let b = BigInt(1);
            
            for (let i = 2; i <= n; i++) {
              const temp = a + b;
              a = b;
              b = temp;
              
              if (!fibonacciCache.has(i)) {
                fibonacciCache.set(i, b);
              }
            }
            
            return b;
          }
          
          const result = calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
          fibonacciCache.set(n, result);
          return result;
        }

        self.addEventListener('message', (event) => {
          const { type, value } = event.data;
          
          if (type === 'CALCULATE_FIBONACCI') {
            const startTime = performance.now();
            
            try {
              const result = calculateFibonacci(value);
              const endTime = performance.now();
              const calculationTime = endTime - startTime;
              
              self.postMessage({
                type: 'FIBONACCI_RESULT',
                input: value,
                result: result.toString(),
                calculationTime: Math.round(calculationTime * 100) / 100
              });
            } catch (error) {
              self.postMessage({
                type: 'FIBONACCI_ERROR',
                input: value,
                error: error.message || 'Unknown error occurred'
              });
            }
          }
        });
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.onmessage = (event) => {
        const data = event.data;

        if (data.type === 'FIBONACCI_RESULT') {
          this.currentResult = {
            input: data.input,
            result: data.result,
            calculationTime: data.calculationTime
          };

          // Add to history
          this.history = [
            {
              input: data.input,
              result: data.result,
              calculationTime: data.calculationTime,
              timestamp: new Date().toLocaleTimeString()
            },
            ...this.history.slice(0, 9) // Keep only last 10 results
          ];

          this.isCalculating = false;
          this.error = null;
        } else if (data.type === 'FIBONACCI_ERROR') {
          this.error = data.error;
          this.isCalculating = false;
        }
      };

      this.worker.onerror = (error) => {
        this.error = `Worker error: ${error.message}`;
        this.isCalculating = false;
      };
    } catch (error) {
      this.error = 'Failed to initialize Web Worker';
      console.error('Worker initialization error:', error);
    }
  }

  @Method()
  async calculateFibonacci(n?: number): Promise<void> {
    const value = n ?? this.inputValue;
    
    if (value < 0 || value > 10000) {
      this.error = 'Please enter a number between 0 and 10000';
      return;
    }

    if (!this.worker) {
      this.error = 'Web Worker not available';
      return;
    }

    this.isCalculating = true;
    this.error = null;

    this.worker.postMessage({
      type: 'CALCULATE_FIBONACCI',
      value: value
    });
  }

  private handleInputChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    this.inputValue = parseInt(target.value, 10) || 0;
  };

  private handleSubmit = (event: Event) => {
    event.preventDefault();
    this.calculateFibonacci();
  };

  private formatNumber(num: string): string {
    // Add thousand separators for better readability
    if (num.length > 6) {
      return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return num;
  }

  render() {
    return (
      <div class="fibonacci-calculator">
        <div class="header">
          <h1>🧮 Fibonacci Calculator</h1>
          <p>High-performance Fibonacci calculation using Web Workers</p>
        </div>

        <form onSubmit={this.handleSubmit} class="calculator-form">
          <div class="input-group">
            <label htmlFor="fibonacci-input">
              Enter a number (0-10000):
            </label>
            <input
              id="fibonacci-input"
              type="number"
              min="0"
              max="10000"
              value={this.inputValue.toString()}
              onInput={this.handleInputChange}
              disabled={this.isCalculating}
            />
            <button 
              type="submit" 
              disabled={this.isCalculating}
              class="calculate-btn"
            >
              {this.isCalculating ? '⏳ Calculating...' : '🚀 Calculate'}
            </button>
          </div>
        </form>

        {this.error && (
          <div class="error">
            ❌ {this.error}
          </div>
        )}

        {this.currentResult && (
          <div class="result">
            <h2>Result</h2>
            <div class="result-content">
              <div class="result-item">
                <strong>Input:</strong> {this.currentResult.input}
              </div>
              <div class="result-item">
                <strong>Fibonacci({this.currentResult.input}):</strong>
                <div class="fibonacci-result">
                  {this.formatNumber(this.currentResult.result)}
                </div>
              </div>
              <div class="result-item">
                <strong>Calculation Time:</strong> {this.currentResult.calculationTime}ms
              </div>
            </div>
          </div>
        )}

        {this.history.length > 0 && (
          <div class="history">
            <h3>📊 Recent Calculations</h3>
            <div class="history-list">
              {this.history.map((item, index) => (
                <div key={index} class="history-item">
                  <div class="history-input">F({item.input})</div>
                  <div class="history-result">{this.formatNumber(item.result)}</div>
                  <div class="history-time">{item.calculationTime}ms</div>
                  <div class="history-timestamp">{item.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div class="info">
          <h3>ℹ️ About</h3>
          <p>
            This component uses a Web Worker to calculate Fibonacci numbers efficiently 
            without blocking the main UI thread. It includes memoization for optimal performance 
            and supports calculations up to F(10000).
          </p>
        </div>
      </div>
    );
  }
}
