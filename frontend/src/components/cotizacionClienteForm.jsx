"use client";

export function CotizacionClienteForm({ cliente, onChangeCliente, errores, setErrores }) {
  const handleChange = (field, value) => {
    onChangeCliente(field, value);
    if (errores[field]) {
      setErrores((prev) => ({ ...prev, [field]: null }));
    }
  };

  const hasErrors = Object.values(errores || {}).some(Boolean);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Banner de error arriba del formulario */}
      {hasErrors && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          Faltan campos obligatorios para continuar.
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Datos del cliente</h2>

      <div className="space-y-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={cliente.nombre}
            onChange={(e) => handleChange("nombre", e.target.value)}
            className={`w-full px-4 py-2.5 text-sm border rounded focus:outline-none focus:ring-2 placeholder:text-gray-400 ${
              errores.nombre
                ? "border-red-500 focus:ring-red-400"
                : "border-gray-300 focus:ring-black"
            }`}
            placeholder="Nombre completo"
          />
          {errores.nombre && (
            <p className="text-xs text-red-500 mt-1">{errores.nombre}</p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Teléfono <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={cliente.telefono}
            onChange={(e) => handleChange("telefono", e.target.value)}
            className={`w-full px-4 py-2.5 text-sm border rounded focus:outline-none focus:ring-2 placeholder:text-gray-400 ${
              errores.telefono
                ? "border-red-500 focus:ring-red-400"
                : "border-gray-300 focus:ring-black"
            }`}
            placeholder="10 dígitos"
          />
          {errores.telefono && (
            <p className="text-xs text-red-500 mt-1">{errores.telefono}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Email (opcional)
          </label>
          <input
            type="email"
            value={cliente.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
            placeholder="correo@ejemplo.com"
          />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Dirección (opcional)
          </label>
          <textarea
            value={cliente.direccion}
            onChange={(e) => handleChange("direccion", e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
            rows={3}
            placeholder="Calle, número, colonia, ciudad..."
          />
        </div>

        {/* Comentarios */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Comentarios / notas (opcional)
          </label>
          <textarea
            value={cliente.comentarios}
            onChange={(e) => handleChange("comentarios", e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"
            rows={3}
            placeholder="Información adicional sobre la cotización..."
          />
        </div>
      </div>
    </div>
  );
}
