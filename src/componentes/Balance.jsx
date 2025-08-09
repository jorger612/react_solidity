import {parseEther, BrowserProvider, ethers } from "ethers";
import {useEffect, useState} from "react";
import { useForm } from "react-hook-form";
const {ethereum} = window;

export function Balance(){
    // Aquí podrías usar ethereun para obtener el balance
    const {register, handleSubmit} = useForm();
    const [cuenta, setCuenta] = useState(null);
    const [balance, setBalance] = useState(null);
    const [ok, setOK] = useState(null);
    const [ko, setKO] = useState(null);

    useEffect(() => {
       ethereum && ethereum.request({method:'eth_requestAccounts'}).then(cuenta => {
        setCuenta(cuenta[0])
        ethereum.on('accountsChanged', (i) => {
            setCuenta(i[0])
        })  
       })
    },[])
    useEffect(() => {
        if(cuenta){
            //const provider = new ethers.providers.Web3Provider(ethereum);
            const provider = new BrowserProvider(window.ethereum);
            provider.getBalance(cuenta).then(balance => {
                console.log(ethers.formatEther(balance))
                setBalance(ethers.formatEther(balance))
            })
        }
    },[cuenta])
    

    async function submit(data){
        setKO(null);
        setOK(null);        
        const parametros = {
            from:  "0xB7393AD6D79663D4d56aE0988cEe1d94e72F5608",//cuenta,
            to: data.address,
            value: "0x" + parseEther(data.amount).toString(16)
        }
        console.log(parametros);
        try {
            const txHash = await ethereum.request({
                  method: 'eth_sendTransaction',
                  params: [parametros]});
                  setOK(txHash);
                  
           
        } catch (error) {
            //console.log("Carga error");
            setKO("Error en la Transacción: " + error.message);
        } 
        console.log(data);
    }    

    if(!ethereum){
        return <div>No hay metamask</div>
    }   
    return (
         <div>
            <p>
            {
            cuenta ? cuenta : 'Cargando...'

            }
            </p>
            <p>Saldo...
            {
            balance ? balance : 'Cargando Balance...'

            }
            </p>
            <form className="form-inline" onSubmit={handleSubmit(submit)}>
                <div className="form-group mb-3">
                    <label htmlFor="address">Address</label>
                    <input defaultValue="0xB7393AD6D79663D4d56aE0988cEe1d94e72F5608" id="address" className="form-control" {...register("address")} />   
                </div>     
                <div className="form-group mb-3">
                    <label htmlFor="amount">Amount</label>
                    <input defaultValue="0.0012" id="amount" className="form-control" {...register("amount")} />   
                </div>  
                <button type="submit" className="btn btn-primary mb-3">Send</button>   
            </form>
            {ok && <div className="alert alert-info mt-3">{ok}</div>}
            {ko && <div className="alert alert-danger mt-3">{ko}</div>}

            </div>
    )        
}   