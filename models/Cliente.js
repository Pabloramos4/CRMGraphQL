const mongoose = require("mongoose");

const clienteSchema = mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  apellido: {
    type: String,
    required: true,
    trim: true,
  },
  empresa: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  telefono: {
    type: String,
    trim: true,
  },
  creado: {
    type: Date,
    default: Date.now(),
  },
  //Para hacer la referencia a la entidad usuario (entidad-relacion) para cada cliente
  vendedor: {
    type: mongoose.Schema.Types.ObjectId,
    require: true,
    ref: "Usuario",
  },
});

module.exports = mongoose.model("Cliente", clienteSchema);
