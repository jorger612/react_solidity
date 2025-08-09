import { useQuery } from "react-query";
import axios from "axios";

function getProductos() {
    return axios.get('http://localhost:8080/sql?sql=select * from products order by product_name')
}

export function Producto(){
    const {data: productos, isLoading, isError} = useQuery(['productos'],getProductos)

    if (isLoading){
        return <div>Cargando productos...</div>
    }
    return (
        <table className="table">
            <thead>
                <tr>
                    <th>Id</th>
                    <th>Nombre</th>
                    <th>Precio</th>
                </tr>
            </thead>
            <tbody>
                {productos.data.map(producto => (
                    <tr key={producto.product_id}>
                        <td>{producto.product_id}</td>
                        <td>{producto.product_name}</td>
                        <td className='text-end'>{producto.unit_price}</td>  
                    </tr>      
                ))}
            </tbody>
        </table>
    )
}