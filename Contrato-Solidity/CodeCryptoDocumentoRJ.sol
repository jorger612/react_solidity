// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CodeCryptoDocumentoRJ{

    struct Documento{
        string hasDocumento;
        string path;
        uint idDocumento;
    }

    Documento[] public documentos;
    uint private idDocumento = 0;

    constructor(){
        setDocumento("0","0");
    }

    function setDocumento(string memory _hashDocumento, string memory _path) public {
        documentos.push(Documento({
            hasDocumento: _hashDocumento,
            path: _path,
            idDocumento : idDocumento
        }));        
        idDocumento++;
         
    }

    function getHashDocumento(uint _idDocumento) public view returns(string memory){
        return documentos[_idDocumento].hasDocumento;
    }

    function getPathDocumento(uint _idDocumento) public view returns(string memory){
        return documentos[_idDocumento].path;
    }

}