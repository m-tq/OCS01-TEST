# OCS01-TEST Sample DApp

This is a sample decentralized application (DApp) that demonstrates contract interaction with the Octra wallet extension.

## Features

- **Wallet Connection**: Connect and disconnect from Octra wallet extension
- **Contract Interaction**: Execute both view and call methods on smart contracts
- **Theme Toggle**: Switch between light and dark themes
- **Real-time Results**: Display execution results and transaction hashes
- **Parameter Input**: Dynamic form generation for contract method parameters

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Octra Wallet Extension installed in your browser

### Installation

1. Navigate to the sample-dapp-project directory:
   ```bash
   cd sample-dapp-project
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Connect Wallet**: Click the "Connect Wallet" button in the header to connect your Octra wallet
2. **Select Method**: Choose a contract method from the left panel
3. **Enter Parameters**: Fill in the required parameters for the selected method
4. **Execute**: Click the execute button to run the contract method
5. **View Results**: See the results in the right panel

## Contract Methods

The sample contract includes various mathematical and utility functions:

### View Methods (Read-only)
- `greetCaller`: Get a personalized greeting message
- `getSpec`: Get contract description and information
- `getCredits`: Check token balance for an address
- `dotProduct`: Calculate dot product of two vectors
- `vectorMagnitude`: Calculate vector magnitude
- `power`: Calculate base^exponent
- `factorial`: Calculate factorial of a number
- `fibonacci`: Get fibonacci number
- `gcd`: Calculate greatest common divisor
- `isPrime`: Check if a number is prime
- `matrixDeterminant2x2`: Calculate 2x2 matrix determinant
- `linearInterpolate`: Perform linear interpolation
- `modularExponentiation`: Calculate modular exponentiation

### Call Methods (Transactions)
- `claimToken`: Claim 1 token (only once per address)

## Contract Information

- **Contract Address**: `octBUHw585BrAMPMLQvGuWx4vqEsybYH9N7a3WNj1WBwrDn`
- **Network**: Octra Mainnet

## Development

### Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # UI components (shadcn/ui)
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
└── App.tsx             # Main application component
```

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## SDK Integration

This DApp uses the Octra SDK for wallet interaction:

```javascript
// Initialize SDK
const sdk = new window.OctraSDK();

// Connect wallet
const result = await sdk.connect({
  appName: 'OCS01-TEST',
  permissions: ['view_address', 'sign_transactions']
});

// Execute view call
const viewResult = await sdk.viewCall({
  contractAddress: 'oct...',
  methodName: 'balanceOf',
  params: [...]
});

// Execute contract call
const callResult = await sdk.callContract({
  contractAddress: 'oct...',
  methodName: 'transfer',
  params: [...],
  gasLimit: 100000,
  gasPrice: 0.001
});
```

## Contributing

This is a sample project for demonstration purposes. Feel free to use it as a template for your own DApps.

## License

MIT License - see the LICENSE file for details.