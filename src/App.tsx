import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet, 
  X, 
  Code, 
  Eye, 
  Send, 
  Calculator,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import contract interface
import contractInterface from '../sample-contract/exec_interface.json';

// Extend the window object to include OctraSDK
declare global {
  interface Window {
    OctraSDK?: new () => OctraSDKType;
  }
}

// Define types for OctraSDK and related objects
interface OctraSDKType {
  isAvailable: () => Promise<boolean>;
  connect: (options: { appName: string; appIcon: string; permissions: string[] }) => Promise<{ success: boolean; address: string }>;
  disconnect: () => Promise<void>;
  viewCall: (options: { contractAddress: string; methodName: string; params: any[]; description: string }) => Promise<any>;
  callContract: (options: { contractAddress: string; methodName: string; params: any[]; description: string; gasLimit: number; gasPrice: number }) => Promise<any>;
  clearConnectionState: () => void;
  provider?: {
    on: (event: string, callback: (data: any) => void) => void;
    off: (event: string, callback: (data: any) => void) => void;
  };
  isConnected?: boolean;
  connectedAddress?: string;
  _eventHandlers?: {
    handleConnect: (data: any) => void;
    handleDisconnect: () => void;
    handleAccountsChanged: (accounts: string[]) => void;
  };
}

interface ContractMethod {
  name: string;
  type: 'view' | 'call';
  label: string;
  params: { name: string; type: string; example?: string; max?: number }[];
}

interface ContractInterface {
  contract: string;
  methods: ContractMethod[];
}

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState('');
  const [octraSDK, setOctraSDK] = useState<OctraSDKType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<ContractMethod | null>(null);
  const [methodParams, setMethodParams] = useState<Record<string, string | number>>({});
  const [lastResult, setLastResult] = useState<{ type: string; result?: any; txHash?: string } | null>(null);
  const { toast } = useToast();

  // Initialize Octra SDK
  useEffect(() => {
    let sdk: OctraSDKType | null = null;
    
    const initSDK = async () => {
      try {
        // Check if OctraSDK is available
        if (window.OctraSDK) {
          sdk = new window.OctraSDK();
          setOctraSDK(sdk);
          
          // Wait for provider to be available
          const isAvailable = await sdk.isAvailable();
          if (isAvailable) {
            // Set up event listeners for connection changes
            if (sdk.provider) {
              const handleConnect = (data: any) => {
                setIsConnected(true);
                setConnectedAddress(data.address);
                toast({
                  title: "Wallet Connected",
                  description: `Connected to ${data.address.slice(0, 8)}...${data.address.slice(-6)}`,
                });
              };

              const handleDisconnect = () => {
                setIsConnected(false);
                setConnectedAddress('');
                setSelectedMethod(null);
                setMethodParams({});
                setLastResult(null);
                toast({
                  title: "Wallet Disconnected",
                  description: "Wallet has been disconnected",
                  variant: "destructive",
                });
              };

              const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length > 0) {
                  setConnectedAddress(accounts[0]);
                  setIsConnected(true);
                  toast({
                    title: "Account Changed",
                    description: `Switched to ${accounts[0].slice(0, 8)}...${accounts[0].slice(-6)}`,
                  });
                } else {
                  setConnectedAddress('');
                  setIsConnected(false);
                  setSelectedMethod(null);
                  setMethodParams({});
                  setLastResult(null);
                }
              };

              sdk.provider.on('connect', handleConnect);
              sdk.provider.on('disconnect', handleDisconnect);
              sdk.provider.on('accountsChanged', handleAccountsChanged);

              // Store handlers for cleanup
              sdk._eventHandlers = {
                handleConnect,
                handleDisconnect,
                handleAccountsChanged
              };
            }

            // Check if we have a restored connection from localStorage
            if (sdk.isConnected && sdk.connectedAddress) {
              // Restore the UI state
              setIsConnected(true);
              setConnectedAddress(sdk.connectedAddress);
              console.log('Wallet connection state restored from localStorage');
              
              // Show connection restored message
              toast({
                title: "Wallet Connected",
                description: `Connected to ${sdk.connectedAddress.slice(0, 8)}...${sdk.connectedAddress.slice(-6)}`,
              });
            }
          }
        } else {
          console.warn('Octra SDK not found. Please install the Octra wallet extension.');
        }
      } catch (error) {
        console.error('Failed to initialize Octra SDK:', error);
      }
    };

    initSDK();

    // Cleanup function
    return () => {
      if (sdk && sdk.provider && sdk._eventHandlers) {
        sdk.provider.off('connect', sdk._eventHandlers.handleConnect);
        sdk.provider.off('disconnect', sdk._eventHandlers.handleDisconnect);
        sdk.provider.off('accountsChanged', sdk._eventHandlers.handleAccountsChanged);
      }
    };
  }, []);

  const connectWallet = async () => {
    if (!octraSDK) {
      toast({
        title: "SDK Not Available",
        description: "Please install the Octra wallet extension",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await octraSDK.connect({
        appName: 'OCS01-TEST',
        appIcon: '/logo.png',
        permissions: ['view_address', 'sign_transactions']
      });

      if (result.success) {
        setIsConnected(true);
        setConnectedAddress(result.address);
        toast({
          title: "Wallet Connected",
          description: `Connected to ${result.address.slice(0, 8)}...${result.address.slice(-6)}`,
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    if (octraSDK) {
      try {
        await octraSDK.disconnect();
        setIsConnected(false);
        setConnectedAddress('');
        setSelectedMethod(null);
        setMethodParams({});
        setLastResult(null);
        toast({
          title: "Wallet Disconnected",
          description: "Successfully disconnected from wallet",
        });
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  };

  const handleMethodSelect = (method: ContractMethod) => {
    setSelectedMethod(method);
    // Initialize parameters
    const initialParams: Record<string, string | number> = {};
    method.params.forEach(param => {
      initialParams[param.name] = param.example || '';
    });
    setMethodParams(initialParams);
    setLastResult(null);
  };

  const handleParamChange = (paramName: string, value: string | number) => {
    setMethodParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const executeMethod = async () => {
    if (!selectedMethod || !octraSDK) return;

    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to execute methods",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Convert parameters to the format expected by the SDK
      const params = selectedMethod.params.map(param => ({
        name: param.name,
        type: param.type,
        value: methodParams[param.name] || '',
        example: param.example
      }));

      let result;
      if (selectedMethod.type === 'view') {
        result = await octraSDK.viewCall({
          contractAddress: contractInterface.contract,
          methodName: selectedMethod.name,
          params: params,
          description: selectedMethod.label
        });
      } else {
        result = await octraSDK.callContract({
          contractAddress: contractInterface.contract,
          methodName: selectedMethod.name,
          params: params,
          description: selectedMethod.label,
          gasLimit: 100000,
          gasPrice: 0.001
        });
      }

      setLastResult(result);
      toast({
        title: "Method Executed",
        description: `${selectedMethod.name} executed successfully`,
      });
    } catch (error) {
      // Handle wallet disconnection errors more gracefully
      if ((error as Error).message.includes('not connected') || 
          (error as Error).message.includes('Not connected') ||
          (error as Error).message.includes('wallet') ||
          (error as Error).message.includes('extension')) {
        setIsConnected(false);
        setConnectedAddress('');
        if (octraSDK) {
          octraSDK.clearConnectionState();
        }
        toast({
          title: "Wallet Disconnected",
          description: "Please reconnect your wallet and try again",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Execution Failed",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const copyAddress = async () => {
    if (connectedAddress) {
      try {
        await navigator.clipboard.writeText(connectedAddress);
        toast({
          title: "Address Copied",
          description: "Wallet address copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy address to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  const useMyAddress = () => {
    if (selectedMethod && selectedMethod.name === 'getCredits' && connectedAddress) {
      setMethodParams(prev => ({
        ...prev,
        address: connectedAddress
      }));
      toast({
        title: "Address Set",
        description: "Your wallet address has been set as parameter",
      });
    }
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="octra-sample-dapp-theme">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Code className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">OCS01-TEST</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className="flex items-center gap-2 cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={copyAddress}
                    title="Click to copy address"
                  >
                    <CheckCircle className="h-3 w-3" />
                    {truncateAddress(connectedAddress)}
                    <Copy className="h-3 w-3 ml-1" />
                  </Badge>
                  <Button variant="outline" onClick={disconnectWallet}>
                    <X className="h-4 w-4 mr-2" />
                    Disconnect Wallet
                  </Button>
                </div>
              ) : (
                <Button onClick={connectWallet} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4 mr-2" />
                  )}
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {!isConnected ? (
            <div className="text-center py-12">
              <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Connect your Octra wallet to interact with the sample contract
              </p>
              <Button onClick={connectWallet} disabled={isLoading} size="lg">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4 mr-2" />
                )}
                Connect Wallet
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {/* Contract Methods */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Contract Methods
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Contract: {truncateAddress(contractInterface.contract)}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {contractInterface.methods.map((method, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedMethod?.name === method.name
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:bg-muted'
                        }`}
                        onClick={() => handleMethodSelect(method)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{method.name}</h4>
                          <Badge variant={method.type === 'view' ? 'secondary' : 'default'}>
                            {method.type === 'view' ? (
                              <><Eye className="h-3 w-3 mr-1" />View</>
                            ) : (
                              <><Send className="h-3 w-3 mr-1" />Call</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{method.label}</p>
                        {method.params.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Parameters: {method.params.map(p => p.name).join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Method Execution */}
              <div className="space-y-6">
                {selectedMethod ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Execute: {selectedMethod.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedMethod.label}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Parameters */}
                      {selectedMethod.params.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Parameters</h4>
                            {selectedMethod.name === 'getCredits' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={useMyAddress}
                                className="text-xs"
                              >
                                Use My Address
                              </Button>
                            )}
                          </div>
                          {selectedMethod.params.map((param, index) => (
                            <div key={index} className="space-y-2">
                              <Label htmlFor={param.name}>
                                {param.name} ({param.type})
                              </Label>
                              <Input
                                id={param.name}
                                type={param.type === 'number' ? 'number' : 'text'}
                                value={methodParams[param.name] || ''}
                                onChange={(e) => handleParamChange(param.name, e.target.value)}
                                placeholder={param.example || `Enter ${param.name}`}
                                max={param.max}
                              />
                              {param.max && (
                                <p className="text-xs text-muted-foreground">
                                  Maximum value: {param.max}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Execute Button */}
                      <Button 
                        onClick={executeMethod} 
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : selectedMethod.type === 'view' ? (
                          <Eye className="h-4 w-4 mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        {isLoading ? 'Executing...' : `Execute ${selectedMethod.type === 'view' ? 'View' : 'Call'}`}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Select a Method</h3>
                      <p className="text-muted-foreground">
                        Choose a contract method from the list to execute
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Results */}
                {lastResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Execution Result
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {lastResult.type === 'view' ? (
                        <div className="space-y-2">
                          <Label>Result:</Label>
                          <pre className="bg-muted p-3 rounded text-sm overflow-auto">
                            {JSON.stringify(lastResult.result, null, 2)}
                          </pre>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Transaction Hash:</Label>
                          <div className="font-mono text-sm bg-muted p-2 rounded break-all">
                            {lastResult.txHash}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

        </main>

        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;