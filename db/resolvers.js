const Usuario = require("../models/Usuario");
const Producto = require("../models/Producto");
const Cliente = require("../models/Cliente");
const Pedido = require("../models/Pedido");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config({ path: "variables.env" });

const crearToken = (usuario, secreta, expiresIn) => {
  const { id, email, nombre, apellido } = usuario;

  return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn });
};

//Resolvers
const resolvers = {
  Query: {
    //Usuarios
    obtenerUsuario: async (_, {}, ctx) => {
      return ctx.usuario;
    },
    //con el token directo para pruebas desde aqui en el servidor
    // obtenerUsuario: async (_, { token }) => {
    //   const usuarioID = await jwt.verify(token, process.env.SECRETA);
    //   return usuarioID;
    // },

    //Productos
    obtenerProductos: async () => {
      try {
        const productos = await Producto.find({});
        return productos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerProductoByID: async (_, { id }) => {
      //Revisar si el producto Existe
      const producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("El producto no existe.");
      }
      return producto;
    },
    obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find({});
        return clientes;
      } catch (error) {
        console.log("Hubo un error");
        console.log(error);
      }
    },
    obtenerClientesVendedor: async (_, {}, ctx) => {
      try {
        const clientes = await Cliente.find({
          vendedor: ctx.usuario.id.toString(),
        });
        return clientes;
      } catch (error) {
        console.log("Hubo un error");
        console.log(error);
      }
    },
    obtenerCliente: async (_, { id }, ctx) => {
      //Revisar si el cliente existe o no
      const cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("El cliente no existe");
      }

      //quien lo creó puede verlo
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales para ver este Cliente");
      }

      return cliente;
    },

    //Pedidos
    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({});
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedidosByVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = await Pedido.find({
          vendedor: ctx.usuario.id,
        }).populate("cliente");
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedido: async (_, { id }, ctx) => {
      //si el pedido existe o no
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("El pedido no existe");
      }
      //Solo quien lo creo
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }
      //retorna resultado del pedido
      return pedido;
    },
    obtenerPedidosEstado: async (_, { estado }, ctx) => {
      const pedidos = await Pedido.find({
        vendedor: ctx.usuario.id,
        estado: estado,
      });

      return pedidos;
    },

    //Busquedas avanzadas
    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        { $group: { _id: "$cliente", total: { $sum: "$total" } } },
        {
          // ESTE ES COMO UN JOIN EN SQL
          $lookup: {
            from: "clientes",
            localField: "_id",
            foreignField: "_id",
            as: "cliente",
          },
        },
        {
          $limit: 10,
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return clientes;
    },
    mejoresVendedores: async () => {
      const vendedores = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        { $group: { _id: "$vendedor", total: { $sum: "$total" } } },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "vendedor",
          },
        },
        {
          $limit: 3,
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return vendedores;
    },
    buscarPoducto: async (_, { texto }) => {
      const productos = await Producto.find({
        $text: { $search: texto },
      }).limit(10);
      return productos;
    },
  },
  Mutation: {
    //Usuarios
    nuevoUsuario: async (_, { input }) => {
      const { email, password } = input;

      //Revisar si el usuario no esta conectado
      const existeUsaurio = await Usuario.findOne({ email });
      if (existeUsaurio) {
        throw new Error("El usuario ya esta registrado");
      }

      //Hashear el password
      const salt = await bcryptjs.genSaltSync(10);
      console.log(salt);
      input.password = await bcryptjs.hashSync(password, salt);

      try {
        //Guardarlo en la BD
        const usuario = new Usuario(input);
        usuario.save();
        return usuario;
      } catch (error) {
        console.log(error);
      }

      return "Creando...";
    },
    autenticarUsuario: async (_, { input }) => {
      const { email, password } = input;

      //Si ul usuario existe
      const existeUsuario = await Usuario.findOne({ email });
      if (!existeUsuario) {
        throw new Error("El usuario NO Existe");
      }

      //Revisar si el password es correcto
      const passwordCorrecto = await bcryptjs.compareSync(
        password,
        existeUsuario.password
      );
      if (!passwordCorrecto) {
        throw new Error("El password es incorrecto");
      }

      //Crear Token
      return {
        token: crearToken(existeUsuario, process.env.SECRETA, "24h"),
      };
    },

    //Productos
    nuevoProducto: async (_, { input }) => {
      try {
        const producto = new Producto(input);
        //almacenar en la BD
        const resultado = await producto.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarProducto: async (_, { id, input }) => {
      //Revisar si el producto Existe
      // console.log(input);
      // console.log(id);
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("El producto no existe.");
      }

      //Guardar en BD
      producto = await Producto.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });

      return producto;
    },
    eliminarProducto: async (_, { id }) => {
      //Revisar si el producto Existe
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("El producto no existe.");
      }

      //Eliminar Producto

      await Producto.findOneAndDelete({ _id: id });

      return "Producto Eliminado";
    },

    //Clientes
    nuevoCliente: async (_, { input }, ctx) => {
      const { email } = input;

      console.log(input);
      //Verificar si el cliente ya esta Registrado
      const cliente = await Cliente.findOne({ email });
      if (cliente) {
        throw new Error("El Cliente ya se encuentra registrado...");
      }

      const nuevoCliente = new Cliente(input);

      //Asignar al Vendedor (usuario loggeado)
      nuevoCliente.vendedor = ctx.usuario.id;

      //Guardar en BD
      try {
        const resultado = await nuevoCliente.save();
        return resultado;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarCliente: async (_, { id, input }, ctx) => {
      //Verificar si existe el cliente
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("El CLiente no existe");
      }

      //Verificar si el vendedor es quien edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales para ver este Cliente");
      }
      //guardar el cliente
      cliente = await Cliente.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });

      return cliente;
    },
    eliminarCliente: async (_, { id }, ctx) => {
      //Verificar si existe el cliente
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("El CLiente no existe");
      }

      //Verificar si el vendedor es quien edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error(
          "No tienes las credenciales para eliminar este Cliente"
        );
      }

      //Eliminar Cliente
      cliente = await Cliente.findOneAndDelete({ _id: id });
      return "Cliente Eliminado";
    },

    //Pedidos
    nuevoPedido: async (_, { input }, ctx) => {
      const { cliente } = input;

      //verificar que el cliente existe
      let clienteExiste = await Cliente.findById(cliente);
      if (!clienteExiste) {
        throw new Error("El CLiente no existe");
      }

      //verificar si el cliente es del vendedor
      if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales para realizar el pedido");
      }

      //Revisar que el Stock este disponible
      for await (const articulo of input.pedido) {
        const { id } = articulo;
        const producto = await Producto.findById(id);

        if (articulo.cantidad > producto.existencia) {
          throw new Error(
            `El articulo: ${producto.nombre} excede la cantidad disponible`
          );
        } else {
          //restar la cantidad a lo disponible
          producto.existencia -= articulo.cantidad;
          //guardamos primero la resta del producto
          await producto.save();
        }
      }
      //Crear nuevo pedido
      const nuevoPedido = new Pedido(input);
      //asignar el vendedor
      nuevoPedido.vendedor = ctx.usuario.id;
      //Guardar en base de datos
      const resultado = await nuevoPedido.save();

      //agregamos los datos que necesitará el query del front que pide del CLIENTE: nombre, apellido, email, telefono
      //ya que aqui solo se recibe el id para guardarlo en la BD

      const pedidoCompletoConCliente = await Pedido.findById(
        resultado.id
      ).populate("cliente", "id nombre apellido email telefono");

      console.log("respuesta pedidowwww:", pedidoCompletoConCliente);
      return pedidoCompletoConCliente;
    },
    actualizarPedido: async (_, { id, input }, ctx) => {
      const { cliente } = input;
      //si el pedido existe
      const existePedido = await Pedido.findById(id);
      if (!existePedido) {
        throw new Error("El pedido no existe...");
      }

      //si el cliente existe
      const existeCliente = await Cliente.findById(cliente);
      if (!existeCliente) {
        throw new Error("El cliente no existe...");
      }

      //si cliente y pedido pertenece al vendedor
      if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales para este pedido");
      }
      //revisar Stock
      if (input.pedido) {
        for await (const articulo of input.pedido) {
          const { id } = articulo;
          const producto = await Producto.findById(id);

          if (articulo.cantidad > producto.existencia) {
            throw new Error(
              `El articulo: ${producto.nombre} excede la cantidad disponible`
            );
          } else {
            //restar la cantidad a lo disponible
            producto.existencia -= articulo.cantidad;
            //guardamos primero la resta del producto
            await producto.save();
          }
        }
      }

      //guardar el pedido en bd
      const resultado = await Pedido.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return resultado;
    },
    eliminarPedido: async (_, { id }, ctx) => {
      //verificar si el pedido existe
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("El pedido no existe");
      }
      //verificar si el vendedor correcto es quien lo intenta borrar
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales para eliminar este pedido");
      }

      //Sumamos a cada producto el numero de articulos señalado en el pedido
      for await (const articulo of pedido.pedido) {
        const { id } = articulo;
        const producto = await Producto.findById(id);

        //sumar la cantidad a lo disponible
        producto.existencia += articulo.cantidad;
        //guardamos primero la suma del producto
        await producto.save();
      }

      //eliminar el pedido
      await Pedido.findOneAndDelete({ _id: id });
      return "Pedido Eliminado";
    },
  },
};

module.exports = resolvers;
