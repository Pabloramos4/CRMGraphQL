const mongoose = require("mongoose");

const productoSchema = mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  existencia: {
    type: Number,
    require: true,
    trim: true,
  },
  precio: {
    type: Number,
    require: true,
    trim: true,
  },
  creado: {
    type: Date,
    default: Date.now(),
  },
});
productoSchema.index({ nombre: "text" });
module.exports = mongoose.model("Producto", productoSchema);
