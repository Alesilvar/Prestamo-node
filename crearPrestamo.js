const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configuración de DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient();
const prestamosTable = 'TABLA-PRESTAMOS';

// Función auxiliar para convertir fechas en formato ISO
function calcularFechaVencimiento(plazo) {
  const fechaActual = new Date();
  const nuevaFecha = new Date(fechaActual.setFullYear(fechaActual.getFullYear() + Math.floor(plazo / 12)));
  return nuevaFecha.toISOString();
}

// Lambda handler
exports.lambdaHandler = async (event) => {
  try {
    // Parsear el cuerpo de la solicitud
    const data = JSON.parse(event.body);
    console.log(`Datos recibidos: ${JSON.stringify(data)}`);

    const usuario_id = data.usuario_id;
    const cuenta_id = data.cuenta_id;
    const monto = parseFloat(data.monto); // Convertir monto a número flotante
    const plazo = parseInt(data.plazo, 10); // Convertir plazo a entero
    const tasa_interes = parseFloat(data.tasa_interes); // Convertir tasa_interes a flotante
    const descripcion = data.descripcion || 'Préstamo solicitado';

    // Generar un ID único para el préstamo
    const prestamo_id = uuidv4();

    // Cálculo del monto total con intereses
    const monto_total = parseFloat((monto + (monto * tasa_interes / 100)).toFixed(2)); // Redondear a 2 decimales

    // Crear el préstamo
    const fecha_creacion = new Date().toISOString();
    const fecha_vencimiento = calcularFechaVencimiento(plazo);

    const prestamoItem = {
      usuario_id,
      prestamo_id,
      cuenta_id,
      monto: monto_total,
      descripcion,
      estado: 'activo',
      plazo,
      tasa_interes,
      fecha_creacion,
      fecha_vencimiento,
    };
    console.log(`Préstamo a registrar: ${JSON.stringify(prestamoItem)}`);

    // Guardar el préstamo en DynamoDB
    await dynamodb
      .put({
        TableName: prestamosTable,
        Item: prestamoItem,
      })
      .promise();

    // Responder con los datos
    return {
      statusCode: 200,
      body: {
        message: 'Préstamo creado exitosamente',
        prestamo: prestamoItem,
      },
    };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error interno al crear el préstamo',
        details: error.message,
      }),
    };
  }
};
