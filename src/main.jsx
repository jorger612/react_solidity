import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Route } from 'react-router-dom'
import {Routes} from 'react-router-dom'
import { Home } from './componentes/Home'
import './index.css'
import { Producto } from './componentes/productos'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Balance } from './componentes/Balance'
import { Formulario } from './componentes/Formulario'

const queryClient = new QueryClient()
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
         <Route path="/" element={<Home></Home>} >
            <Route path="/productos" element={<Producto></Producto>} />
            <Route path="/balance" element={<Balance></Balance>} />
            <Route path="/Formulario" element={<Formulario></Formulario>} />
         </Route>
      </Routes>
    </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
