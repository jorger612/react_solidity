import { useState, useRef, useEffect } from "react";
import { parseEther, BrowserProvider, ethers } from "ethers";

// contrato: 0x76b554b49c60C673B428A4F5331727e5138C0Ba7
// wallet: 0xB7393AD6D79663D4d56aE0988cEe1d94e72F5608

export function Validar() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileSize, setFileSize] = useState(0);
    const [documentId, setDocumentId] = useState("");
    const [validationStatus, setValidationStatus] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [fileHash, setFileHash] = useState("");
    const [blockchainHash, setBlockchainHash] = useState("");
    const [isCalculatingHash, setIsCalculatingHash] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState("");
    const fileInputRef = useRef(null);

    // ABI mínimo para el método getHashDocumento
    const contractABI = [
        "function getHashDocumento(uint256 _id) public view returns (string memory)"
    ];

    // WebSocket para conexión en tiempo real (gratuito)
    const [wsConnection, setWsConnection] = useState(null);

    // Inicializar WebSocket al montar el componente
    useEffect(() => {
        // Usar un WebSocket gratuito público para pruebas
        const ws = new WebSocket('wss://echo.websocket.org');
        
        ws.onopen = () => {
            console.log('WebSocket conectado para validación en tiempo real');
            setWsConnection(ws);
        };

        ws.onmessage = (event) => {
            console.log('Mensaje WebSocket recibido:', event.data);
        };

        ws.onerror = (error) => {
            console.error('Error en WebSocket:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket desconectado');
            setWsConnection(null);
        };

        // Limpiar al desmontar
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    // Función para conectar wallet específica
    const connectWallet = async () => {
        try {
            if (typeof window.ethereum !== 'undefined') {
                // Solicitar conexión a la wallet específica
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const connectedAddress = accounts[0];
                
                // Verificar si es la wallet correcta
                if (connectedAddress.toLowerCase() === '0xb7393ad6d79663d4d56ae0988cee1d94e72f5608'.toLowerCase()) {
                    setWalletAddress(connectedAddress);
                    setIsConnected(true);
                    setValidationStatus("Wallet correcta conectada exitosamente");
                    
                    // Enviar mensaje por WebSocket
                    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                        wsConnection.send(JSON.stringify({
                            type: 'wallet_connected',
                            address: connectedAddress,
                            timestamp: new Date().toISOString()
                        }));
                    }
                } else {
                    setValidationStatus("Error: Debes conectar la wallet 0xB7393AD6D79663D4d56aE0988cEe1d94e72F5608");
                    setIsConnected(false);
                }
            } else {
                setValidationStatus("Error: MetaMask no está instalado");
            }
        } catch (error) {
            setValidationStatus(`Error al conectar wallet: ${error.message}`);
        }
    };

    // Función para calcular hash SHA-256 del archivo
    const calculateFileHash = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    resolve(hashHex);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    // Función para manejar la selección de archivos
    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setFileSize(file.size);
            setValidationStatus("");
            setFileHash("");
            setBlockchainHash("");
            
            // Calcular hash automáticamente
            setIsCalculatingHash(true);
            try {
                const hash = await calculateFileHash(file);
                setFileHash(hash);
                setValidationStatus("Hash del archivo calculado exitosamente");
                
                // Enviar por WebSocket
                if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                    wsConnection.send(JSON.stringify({
                        type: 'file_hash_calculated',
                        fileName: file.name,
                        fileHash: hash,
                        timestamp: new Date().toISOString()
                    }));
                }
            } catch (error) {
                setValidationStatus(`Error al calcular hash: ${error.message}`);
            } finally {
                setIsCalculatingHash(false);
            }
        }
    };

    // Función para convertir bytes a formato legible
    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Función para validar el documento
    const validateDocument = async () => {
        if (!selectedFile) {
            setValidationStatus("Error: No se ha seleccionado ningún archivo");
            return;
        }

        if (!documentId.trim()) {
            setValidationStatus("Error: Debes ingresar el ID del documento");
            return;
        }

        if (!isConnected) {
            setValidationStatus("Error: Debes conectar la wallet primero");
            return;
        }

        if (!fileHash) {
            setValidationStatus("Error: No se pudo calcular el hash del archivo");
            return;
        }

        setIsValidating(true);
        setValidationStatus("Validando documento en blockchain...");

        try {
            // Conectar a la blockchain
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Crear instancia del contrato
            const contractAddress = "0x76b554b49c60C673B428A4F5331727e5138C0Ba7";
            const contract = new ethers.Contract(contractAddress, contractABI, signer);

            // Llamar al método getHashDocumento del contrato
            const blockchainHashResult = await contract.getHashDocumento(documentId);
            setBlockchainHash(blockchainHashResult);

            // Comparar hashes
            if (fileHash.toLowerCase() === blockchainHashResult.toLowerCase()) {
                setValidationStatus("El documento está Correcto :)");
                
                // Enviar por WebSocket
                if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                    wsConnection.send(JSON.stringify({
                        type: 'validation_success',
                        documentId: documentId,
                        fileHash: fileHash,
                        blockchainHash: blockchainHashResult,
                        timestamp: new Date().toISOString()
                    }));
                }
            } else {
                setValidationStatus("Alerta !! Documento Alterado !!!");
                
                // Enviar por WebSocket
                if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                    wsConnection.send(JSON.stringify({
                        type: 'validation_failed',
                        documentId: documentId,
                        fileHash: fileHash,
                        blockchainHash: blockchainHashResult,
                        timestamp: new Date().toISOString()
                    }));
                }
            }
            
        } catch (error) {
            setValidationStatus(`Error al validar documento: ${error.message}`);
        } finally {
            setIsValidating(false);
        }
    };

    // Función para limpiar la selección
    const clearSelection = () => {
        setSelectedFile(null);
        setFileSize(0);
        setDocumentId("");
        setValidationStatus("");
        setFileHash("");
        setBlockchainHash("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Función para copiar el hash al portapapeles
    const copyHashToClipboard = async (hash) => {
        try {
            await navigator.clipboard.writeText(hash);
            setValidationStatus("Hash copiado al portapapeles exitosamente");
            setTimeout(() => setValidationStatus(""), 3000);
        } catch (error) {
            setValidationStatus("Error al copiar el hash al portapapeles");
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-header bg-warning text-dark">
                            <h3 className="mb-0">🔍 Validar Documentos en Blockchain</h3>
                        </div>
                        <div className="card-body">
                            {/* Sección de conexión de wallet */}
                            <div className="mb-4">
                                <h6>Conectar Wallet Específica</h6>
                                {!isConnected ? (
                                    <div>
                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            onClick={connectWallet}
                                        >
                                            Conectar MetaMask
                                        </button>
                                        <div className="form-text mt-2">
                                            <strong>Wallet requerida:</strong> 0xB7393AD6D79663D4d56aE0988cEe1d94e72F5608
                                        </div>
                                    </div>
                                ) : (
                                    <div className="alert alert-success">
                                        <strong>✅ Wallet correcta conectada:</strong> {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
                                    </div>
                                )}
                            </div>

                            {/* Campo para ID del documento */}
                            <div className="mb-4">
                                <label htmlFor="documentId" className="form-label fw-bold">
                                    ID del Documento
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    id="documentId"
                                    value={documentId}
                                    onChange={(e) => setDocumentId(e.target.value)}
                                    placeholder="Ingresa el ID del documento a validar"
                                />
                                <div className="form-text">
                                    Ingresa el ID numérico del documento registrado en la blockchain
                                </div>
                            </div>

                            {/* Campo para seleccionar archivo */}
                            <div className="mb-4">
                                <label htmlFor="fileInput" className="form-label fw-bold">
                                    Seleccionar Archivo para Validar
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="form-control"
                                    id="fileInput"
                                    onChange={handleFileSelect}
                                    accept="*/*"
                                />
                                <div className="form-text">
                                    Selecciona el archivo que quieres validar contra el registro en blockchain
                                </div>
                            </div>

                            {/* Información del archivo seleccionado */}
                            {selectedFile && (
                                <div className="alert alert-info">
                                    <h6>📁 Archivo Seleccionado:</h6>
                                    <p className="mb-1"><strong>Nombre:</strong> {selectedFile.name}</p>
                                    <p className="mb-1"><strong>Tamaño:</strong> {formatFileSize(fileSize)}</p>
                                    <p className="mb-0"><strong>Tipo:</strong> {selectedFile.type || "No especificado"}</p>
                                </div>
                            )}

                            {/* Hash del archivo */}
                            {fileHash && (
                                <div className="alert alert-success">
                                    <h6>🔐 Hash SHA-256 del Archivo:</h6>
                                    <div className="bg-dark text-light p-3 rounded">
                                        <code className="text-break" style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                            {fileHash}
                                        </code>
                                    </div>
                                    <div className="mt-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-light"
                                            onClick={() => copyHashToClipboard(fileHash)}
                                            title="Copiar hash al portapapeles"
                                        >
                                            📋 Copiar Hash
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Hash de la blockchain */}
                            {blockchainHash && (
                                <div className="alert alert-primary">
                                    <h6>⛓️ Hash de la Blockchain:</h6>
                                    <div className="bg-dark text-light p-3 rounded">
                                        <code className="text-break" style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                            {blockchainHash}
                                        </code>
                                    </div>
                                    <div className="mt-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-light"
                                            onClick={() => copyHashToClipboard(blockchainHash)}
                                            title="Copiar hash al portapapeles"
                                        >
                                            📋 Copiar Hash
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Indicadores de estado */}
                            {isCalculatingHash && (
                                <div className="alert alert-warning">
                                    <div className="d-flex align-items-center">
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        <span>Calculando hash del archivo...</span>
                                    </div>
                                </div>
                            )}

                            {/* Estado de WebSocket */}
                            <div className="mb-3">
                                <small className={`badge ${wsConnection ? 'bg-success' : 'bg-secondary'}`}>
                                    {wsConnection ? '🔗 WebSocket Conectado' : '🔌 WebSocket Desconectado'}
                                </small>
                            </div>

                            {/* Mensaje de validación */}
                            {validationStatus && (
                                <div className={`alert ${validationStatus.includes('Correcto') ? 'alert-success' : validationStatus.includes('Alerta') ? 'alert-danger' : validationStatus.includes('Error') ? 'alert-danger' : 'alert-info'}`}>
                                    <h6 className="mb-0">
                                        {validationStatus.includes('Correcto') ? '✅ ' : validationStatus.includes('Alerta') ? '🚨 ' : ''}
                                        {validationStatus}
                                    </h6>
                                </div>
                            )}

                            {/* Botones de acción */}
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-warning"
                                    onClick={validateDocument}
                                    disabled={!selectedFile || !documentId.trim() || isValidating || !isConnected}
                                >
                                    {isValidating ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Validando...
                                        </>
                                    ) : (
                                        "🔍 Validar Documento"
                                    )}
                                </button>
                                
                                {(selectedFile || documentId) && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={clearSelection}
                                        disabled={isValidating}
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>

                            {/* Información del sistema */}
                            <div className="mt-4">
                                <h6>ℹ️ Información del Sistema:</h6>
                                <ul className="list-unstyled">
                                    <li>• Valida documentos comparando hashes SHA-256</li>
                                    <li>• Conecta a la blockchain Ethereum para verificación</li>
                                    <li>• Contrato: 0x76b554b49c60C673B428A4F5331727e5138C0Ba7</li>
                                    <li>• Método: getHashDocumento(id)</li>
                                    <li>• Wallet requerida: 0xB7393AD6D79663D4d56aE0988cEe1d94e72F5608</li>
                                    <li>• WebSocket para validación en tiempo real</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
