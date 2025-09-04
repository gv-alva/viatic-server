// Viatic-server/viaticoModel.js
const mongoose = require('mongoose');

const viaticoSchema = new mongoose.Schema(
  {
    // Comunes
    mensaje: String,
    tipo: { type: String, enum: ['gasolina', 'viaticos'], required: true },
    nombre: { type: String, required: true },
    fechaGasto: { type: Date, required: true },
    motivoGasto: { type: String, required: true },
    cr: { type: String, match: /^\d{4}$/, required: true },
    sucursal: { type: String, required: true },
    folio: { type: String, required: true },
    observaciones: String,

    // Tipo (para ambos modos)
    tipoServicio: {
      type: String,
      enum: ['Field Services', 'Instalaciones', 'Mantenimiento equipo de transporte', 'Administración'],
      required: true,
    },

    // Gasolina
    origen: String,
    destino: String,
    kmInicial: Number,
    kmFinal: Number,
    km: Number, // kmFinal - kmInicial (calculado)

    // Viáticos
    montoComprobar: Number,

    // Auditoría
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Viatico', viaticoSchema);
