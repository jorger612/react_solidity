export function Formulario() {
    return (
        <form>
            <div className="mb-3">
                <label htmlFor="nombre" className="form-label">Nombre</label>
                <input type="text" className="form-control" id="nombre" placeholder="Ingrese su nombre" />
            </div>
            <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input type="email" className="form-control" id="email" placeholder="Ingrese su email" />
            </div>
            <button type="submit" className="btn btn-primary">Enviar</button>
        </form>
    );
}