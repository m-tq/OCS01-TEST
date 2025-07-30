/**
 * Octra Wallet Extension SDK
 * 
 * This SDK allows dApp developers to interact with the Octra wallet extension
 * for connection requests, contract interactions, and transaction handling.
 * 
 * Usage:
 * ```javascript
 * import OctraSDK from './octra-sdk.js';
 * 
 * const octra = new OctraSDK();
 * 
 * // Check if Octra wallet is available
 * if (await octra.isAvailable()) {
 *   // Request connection
 *   const connection = await octra.connect({
 *     appName: 'My DApp',
 *     appIcon: 'https://example.com/icon.png',
 *     permissions: ['view_address', 'sign_transactions']
 *   });
 * 
 *   // Execute contract view call
 *   const result = await octra.viewCall({
 *     contractAddress: 'oct1...',
 *     methodName: 'balanceOf',
 *     params: [{ name: 'account', type: 'address', value: 'oct1...' }]
 *   });
 * 
 *   // Execute contract call
 *   const txResult = await octra.callContract({
 *     contractAddress: 'oct1...',
 *     methodName: 'transfer',
 *     params: [
 *       { name: 'to', type: 'address', value: 'oct1...' },
 *       { name: 'amount', type: 'uint256', value: '1000000' }
 *     ],
 *     value: '0'
 *   });
 * }
 * ```
 */

class OctraSDK {
  constructor() {
    this.connectedAddress = null;
    this.isConnected = false;
    this.provider = null;
    this.waitForProvider = null;
    
    // Load persisted connection state
    this.loadConnectionState();
    
    // Initialize provider detection
    this.initializeProvider();
  }

  /**
   * Load connection state from localStorage
   */
  loadConnectionState() {
    try {
      const savedState = localStorage.getItem('octra-wallet-state');
      if (savedState) {
        const state = JSON.parse(savedState);
        this.connectedAddress = state.address;
        this.isConnected = state.isConnected;
      }
    } catch (error) {
      console.warn('Failed to load wallet state:', error);
    }
  }

  /**
   * Save connection state to localStorage
   */
  saveConnectionState() {
    try {
      const state = {
        address: this.connectedAddress,
        isConnected: this.isConnected
      };
      localStorage.setItem('octra-wallet-state', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save wallet state:', error);
    }
  }

  /**
   * Clear connection state from localStorage
   */
  clearConnectionState() {
    try {
      localStorage.removeItem('octra-wallet-state');
    } catch (error) {
      console.warn('Failed to clear wallet state:', error);
    }
  }

  /**
   * Verify if the current connection is still valid
   */
  async verifyConnection() {
    if (!this.provider || !this.isConnected) {
      return false;
    }

    try {
      // Simple check - just verify provider exists and we have an address
      return !!(this.provider && this.connectedAddress);
    } catch (error) {
      console.warn('Connection verification failed:', error);
      return false;
    }
  }

  /**
   * Initialize and detect the Octra provider (window.octra)
   */
  async initializeProvider() {
    // Check if window.octra is already available
    if (typeof window !== 'undefined' && window.octra) {
      this.provider = window.octra;
      this.setupProviderListeners();
      return;
    }

    // Wait for provider to be injected
    this.waitForProvider = new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      // Check periodically for window.octra
      const checkProvider = () => {
        if (window.octra) {
          this.provider = window.octra;
          this.setupProviderListeners();
          resolve(true);
          return;
        }
        
        // Check for octraLoaded event
        const handleOctraLoaded = () => {
          if (window.octra) {
            this.provider = window.octra;
            this.setupProviderListeners();
            window.removeEventListener('octraLoaded', handleOctraLoaded);
            resolve(true);
          }
        };
        
        window.addEventListener('octraLoaded', handleOctraLoaded);
        
        // Timeout after 3 seconds
        setTimeout(() => {
          window.removeEventListener('octraLoaded', handleOctraLoaded);
          if (!this.provider) {
            resolve(false);
          }
        }, 3000);
      };

      // Check immediately and then wait for injection
      checkProvider();
    });

    return this.waitForProvider;
  }

  /**
   * Setup event listeners for provider events
   */
  setupProviderListeners() {
    if (!this.provider) return;

    // Listen for connection events
    this.provider.on('connect', (data) => {
      this.isConnected = true;
      this.connectedAddress = data.address;
      this.saveConnectionState();
    });

    // Listen for disconnect events
    this.provider.on('disconnect', () => {
      this.isConnected = false;
      this.connectedAddress = null;
      this.clearConnectionState();
    });

    // Listen for account changes
    this.provider.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        this.connectedAddress = accounts[0];
        this.isConnected = true;
        this.saveConnectionState();
      } else {
        this.connectedAddress = null;
        this.isConnected = false;
        this.clearConnectionState();
      }
    });
  }

  /**
   * Check if the Octra wallet extension is available
   * @returns {Promise<boolean>} True if extension is available
   */
  async isAvailable() {
    // Wait for provider initialization if still pending
    if (this.waitForProvider) {
      await this.waitForProvider;
    }

    return !!this.provider;
  }

  /**
   * Request connection to the wallet extension
   * 
   * @param {Object} options - Connection options
   * @param {string} options.appName - Name of the dApp
   * @param {string} [options.appIcon] - Icon URL for the dApp
   * @param {string[]} [options.permissions] - Requested permissions
   * @returns {Promise<Object>} Connection result
   */
  async connect(options = {}) {
    // Check if extension is available
    const extensionAvailable = await this.isAvailable();
    if (!extensionAvailable) {
      throw new Error('Octra wallet extension is not installed or not available');
    }

    const {
      appName = window.location.hostname,
      appIcon = null,
      permissions = ['view_address']
    } = options;

    try {
      // Use the provider's connect method
      const result = await this.provider.connect(permissions);
      
      this.isConnected = true;
      this.connectedAddress = result.address;
      this.saveConnectionState();
      
      return {
        success: true,
        address: result.address,
        appName: appName
      };
    } catch (error) {
      throw new Error(error.message || 'Connection failed');
    }
  }

  /**
   * Execute a contract view call (read-only)
   * 
   * @param {Object} options - View call options
   * @param {string} options.contractAddress - Contract address
   * @param {string} options.methodName - Method name to call
   * @param {Array} [options.params] - Method parameters
   * @param {string} [options.description] - Description of the call
   * @returns {Promise<Object>} View call result
   */
  async viewCall(options) {
    if (!this.isConnected) {
      throw new Error('Not connected to wallet. Please connect first.');
    }

    const {
      contractAddress,
      methodName,
      params = [],
      description = null
    } = options;

    if (!contractAddress || !methodName) {
      throw new Error('contractAddress and methodName are required');
    }

    try {
      // Use the provider's contract call method
      const result = await this.provider.callContractMethod(
        contractAddress,
        methodName,
        'view',
        params,
        { description }
      );

      return {
        success: true,
        result: result,
        type: 'view'
      };
    } catch (error) {
      throw new Error(error.message || 'View call failed');
    }
  }

  /**
   * Execute a contract call (transaction)
   * 
   * @param {Object} options - Contract call options
   * @param {string} options.contractAddress - Contract address
   * @param {string} options.methodName - Method name to call
   * @param {Array} [options.params] - Method parameters
   * @param {string} [options.value] - Value to send with the transaction (in OCT)
   * @param {number} [options.gasLimit] - Gas limit for the transaction
   * @param {number} [options.gasPrice] - Gas price for the transaction
   * @param {string} [options.description] - Description of the call
   * @returns {Promise<Object>} Contract call result
   */
  async callContract(options) {
    if (!this.isConnected) {
      throw new Error('Not connected to wallet. Please connect first.');
    }

    const {
      contractAddress,
      methodName,
      params = [],
      value = '0',
      gasLimit = 100000,
      gasPrice = 0.001,
      description = null
    } = options;

    if (!contractAddress || !methodName) {
      throw new Error('contractAddress and methodName are required');
    }

    try {
      // Use the provider's contract invocation method
      const result = await this.provider.callContractMethod(
        contractAddress,
        methodName,
        'call',
        params,
        {
          value,
          gasLimit,
          gasPrice,
          description
        }
      );

      return {
        success: true,
        txHash: result.txHash || result.hash,
        type: 'call'
      };
    } catch (error) {
      throw new Error(error.message || 'Contract call failed');
    }
  }

  /**
   * Send a simple transaction
   * 
   * @param {Object} options - Transaction options
   * @param {string} options.to - Recipient address
   * @param {string} options.amount - Amount to send (in OCT)
   * @param {string} [options.message] - Optional message
   * @returns {Promise<Object>} Transaction result
   */
  async sendTransaction(options) {
    if (!this.isConnected) {
      throw new Error('Not connected to wallet. Please connect first.');
    }

    const { to, amount, message = null } = options;

    if (!to || !amount) {
      throw new Error('to and amount are required');
    }

    try {
      // Use the provider's sendTransaction method
      const result = await this.provider.sendTransaction({
        to,
        amount,
        message
      });

      return {
        success: true,
        txHash: result.hash || result.txHash
      };
    } catch (error) {
      throw new Error(error.message || 'Transaction failed');
    }
  }

  /**
   * Get the connected wallet address
   * @returns {string|null} Connected address or null if not connected
   */
  getConnectedAddress() {
    return this.connectedAddress;
  }

  /**
   * Check if wallet is connected
   * @returns {boolean} Connection status
   */
  isWalletConnected() {
    return this.isConnected;
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect() {
    if (this.provider) {
      try {
        await this.provider.disconnect();
      } catch (error) {
        console.warn('Disconnect error:', error);
      }
    }
    
    this.isConnected = false;
    this.connectedAddress = null;
    this.clearConnectionState();
  }

  /**
   * Get wallet information
   * @returns {Object} Wallet information
   */
  getWalletInfo() {
    return {
      isConnected: this.isConnected,
      address: this.connectedAddress,
      isAvailable: !!this.provider
    };
  }

  /**
   * Get account balance
   * @param {string} [address] - Address to get balance for (defaults to connected address)
   * @returns {Promise<string>} Balance in OCT
   */
  async getBalance(address = null) {
    if (!this.isConnected) {
      throw new Error('Not connected to wallet. Please connect first.');
    }

    try {
      const result = await this.provider.getBalance(address || this.connectedAddress);
      return result.balance || result;
    } catch (error) {
      throw new Error(error.message || 'Failed to get balance');
    }
  }

  /**
   * Sign a message
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(message) {
    if (!this.isConnected) {
      throw new Error('Not connected to wallet. Please connect first.');
    }

    try {
      const result = await this.provider.signMessage(message);
      return result.signature || result;
    } catch (error) {
      throw new Error(error.message || 'Failed to sign message');
    }
  }

  /**
   * Get network information
   * @returns {Promise<Object>} Network information
   */
  async getNetwork() {
    if (this.provider) {
      try {
        return await this.provider.getNetwork();
      } catch (error) {
        console.warn('Failed to get network info:', error);
      }
    }

    return {
      chainId: '0x1',
      networkId: 'octra-mainnet',
      name: 'Octra Network'
    };
  }

  /**
   * Add event listener for provider events
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (this.provider) {
      this.provider.on(event, callback);
    }
  }

  /**
   * Remove event listener for provider events
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  off(event, callback) {
    if (this.provider) {
      this.provider.off(event, callback);
    }
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OctraSDK;
}

// Always make available globally for browser usage
if (typeof window !== 'undefined') {
  window.OctraSDK = OctraSDK;
  
  // Also provide a direct reference to window.octra for easier access
  // This creates the window.octra detection pattern similar to window.ethereum
  if (!window.octra && window.OctraSDK) {
    // Create a simple detection object that can be used by dApps
    Object.defineProperty(window, 'octraSDK', {
      get: function() {
        return new OctraSDK();
      },
      configurable: true
    });
  }
}