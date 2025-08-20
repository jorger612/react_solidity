import { useState, useRef } from "react";
import { parseEther, BrowserProvider, ethers } from "ethers";

// contrato: 0x76b554b49c60C673B428A4F5331727e5138C0Ba7

export function Certificar() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileSize, setFileSize] = useState(0);
    const [uploadStatus, setUploadStatus] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [walletAddress, setWalletAddress] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [fileHash, setFileHash] = useState("");
    const [isCalculatingHash, setIsCalculatingHash] = useState(false);
    const fileInputRef = useRef(null);

    // ABI mínimo para el método setDocumento
    const contractABI = [
        "function setDocumento(string memory _hash, string memory _path) public"
    ];

    // Función para conectar wallet
    const connectWallet = async () => {
        try {
            if (typeof window.ethereum !== 'undefined') {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setWalletAddress(accounts[0]);
                setIsConnected(true);
                setUploadStatus("Wallet conectada exitosamente");
            } else {
                setUploadStatus("Error: MetaMask no está instalado");
            }
        } catch (error) {
            setUploadStatus(`Error al conectar wallet: ${error.message}`);
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
            // Verificar el tamaño del archivo (100MB = 100 * 1024 * 1024 bytes)
            const maxSize = 100 * 1024 * 1024; // 100MB en bytes
            const fileSizeInBytes = file.size;
            
            if (fileSizeInBytes > maxSize) {
                setUploadStatus("Error: El archivo excede el límite de 100MB");
                setSelectedFile(null);
                setFileSize(0);
                setFileHash("");
                return;
            }

            setSelectedFile(file);
            setFileSize(fileSizeInBytes);
            setUploadStatus("");
            setFileHash("");
            
            // Calcular hash automáticamente
            setIsCalculatingHash(true);
            try {
                const hash = await calculateFileHash(file);
                setFileHash(hash);
                setUploadStatus("Hash calculado exitosamente");
            } catch (error) {
                setUploadStatus(`Error al calcular hash: ${error.message}`);
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

    // Función para obtener la extensión del archivo
    const getFileExtension = (filename) => {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    };

    // Función para subir el archivo y enviar a blockchain
    const handleFileUpload = async () => {
        if (!selectedFile) {
            setUploadStatus("Error: No se ha seleccionado ningún archivo");
            return;
        }

        if (!isConnected) {
            setUploadStatus("Error: Debes conectar tu wallet primero");
            return;
        }

        setIsUploading(true);
        setUploadStatus("Procesando archivo y enviando a blockchain...");

        try {
            // Usar el hash ya calculado
            if (!fileHash) {
                setUploadStatus("Error: No se pudo calcular el hash del archivo");
                return;
            }
            
            // Crear path único para el archivo
            const timestamp = new Date().getTime();
            const fileExtension = getFileExtension(selectedFile.name);
            const fileName = `archivo_${timestamp}.${fileExtension}`;
            const filePath = `ArchivosCertificados/${fileName}`;

            // Conectar a la blockchain
            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // Crear instancia del contrato
            const contractAddress = "0x76b554b49c60C673B428A4F5331727e5138C0Ba7";
            const contract = new ethers.Contract(contractAddress, contractABI, signer);

            // Llamar al método setDocumento del contrato
            const tx = await contract.setDocumento(fileHash, filePath);
            
            // Esperar a que se confirme la transacción
            await tx.wait();

            setUploadStatus(`Archivo certificado exitosamente en blockchain! Hash: ${fileHash.substring(0, 10)}... Path: ${filePath} | TX: ${tx.hash.substring(0, 10)}...`);
            setSelectedFile(null);
            setFileSize(0);
            
            // Limpiar el input de archivo
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            
        } catch (error) {
            setUploadStatus(`Error al procesar el archivo: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Función para limpiar la selección
    const clearSelection = () => {
        setSelectedFile(null);
        setFileSize(0);
        setUploadStatus("");
        setFileHash("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Función para copiar el hash al portapapeles
    const copyHashToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(fileHash);
            setUploadStatus("Hash copiado al portapapeles exitosamente");
            setTimeout(() => setUploadStatus(""), 3000);
        } catch (error) {
            setUploadStatus("Error al copiar el hash al portapapeles");
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-header bg-primary text-white">
                            <h3 className="mb-0">Certificar Archivos en Blockchain</h3>
                        </div>
                        <div className="card-body">
                            {/* Sección de conexión de wallet */}
                            <div className="mb-4">
                                <h6>Conectar Wallet</h6>
                                {!isConnected ? (
                                    <button
                                        type="button"
                                        className="btn btn-success"
                                        onClick={connectWallet}
                                    >
                                        Conectar MetaMask
                                    </button>
                                ) : (
                                    <div className="alert alert-success">
                                        <strong>Wallet conectada:</strong> {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
                                    </div>
                                )}
                            </div>

                            <div className="mb-4">
                                <label htmlFor="fileInput" className="form-label fw-bold">
                                    Seleccionar Archivo para Certificar
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
                                    Tamaño máximo permitido: 100 MB
                                </div>
                            </div>

                            {selectedFile && (
                                <div className="alert alert-info">
                                    <h6>Archivo Seleccionado:</h6>
                                    <p className="mb-1"><strong>Nombre:</strong> {selectedFile.name}</p>
                                    <p className="mb-1"><strong>Tamaño:</strong> {formatFileSize(fileSize)}</p>
                                    <p className="mb-0"><strong>Tipo:</strong> {selectedFile.type || "No especificado"}</p>
                                </div>
                            )}

                            {/* Mostrar el hash del archivo */}
                            {fileHash && (
                                <div className="alert alert-success">
                                    <h6>🔐 Hash SHA-256 del Archivo:</h6>
                                    <div className="bg-dark text-light p-3 rounded">
                                        <code className="text-break" style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>
                                            {fileHash}
                                        </code>
                                    </div>
                                    <div className="mt-2 d-flex justify-content-between align-items-center">
                                        <small className="text-muted">
                                            Este hash único identifica el contenido del archivo y será enviado a la blockchain
                                        </small>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-light"
                                            onClick={copyHashToClipboard}
                                            title="Copiar hash al portapapeles"
                                        >
                                            📋 Copiar Hash
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Indicador de cálculo de hash */}
                            {isCalculatingHash && (
                                <div className="alert alert-warning">
                                    <div className="d-flex align-items-center">
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        <span>Calculando hash del archivo...</span>
                                    </div>
                                </div>
                            )}

                            {uploadStatus && (
                                <div className={`alert ${uploadStatus.includes('Error') ? 'alert-danger' : uploadStatus.includes('exitosamente') ? 'alert-success' : 'alert-info'}`}>
                                    {uploadStatus}
                                </div>
                            )}

                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleFileUpload}
                                    disabled={!selectedFile || isUploading || !isConnected}
                                >
                                    {isUploading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Procesando en Blockchain...
                                        </>
                                    ) : (
                                        "Certificar en Blockchain"
                                    )}
                                </button>
                                
                                {selectedFile && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={clearSelection}
                                        disabled={isUploading}
                                    >
                                        Limpiar Selección
                                    </button>
                                )}
                            </div>

                            <div className="mt-4">
                                <h6>Información del Sistema:</h6>
                                <ul className="list-unstyled">
                                    <li>• Los archivos se certifican en la blockchain Ethereum</li>
                                    <li>• Se calcula un hash SHA-256 único para cada archivo</li>
                                    <li>• Límite de tamaño: 100 MB por archivo</li>
                                    <li>• Contrato: 0x76b554b49c60C673B428A4F5331727e5138C0Ba7</li>
                                    <li>• Método: setDocumento(hash, path)</li>
                                    <li>• Requiere conexión de wallet MetaMask</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
