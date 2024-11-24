const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const prestamosTable = 'TABLA-PRESTAMOS';

exports.lambdaHandler = async (event) => {
    try {
        const data = JSON.parse(event.body);
        const { usuario_id, prestamo_id } = data;

        // Obtener el préstamo de DynamoDB
        const response = await dynamoDb.get({
            TableName: prestamosTable,
            Key: {
                usuario_id: usuario_id,
                prestamo_id: prestamo_id
            }
        }).promise();

        const prestamo = response.Item;

        if (!prestamo) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Préstamo no encontrado' })
            };
        }

        // Lógica para calcular el interés acumulado si está fuera del plazo
        const fechaCreacion = new Date(prestamo.fecha_creacion);
        const plazo = parseInt(prestamo.plazo, 10); // Convertir a número entero
        const tasaInteres = parseFloat(prestamo.tasa_interes); // Convertir a número decimal
        const fechaLimite = new Date(fechaCreacion);
        fechaLimite.setDate(fechaLimite.getDate() + plazo); // Sumar los días del plazo

        if (new Date() > fechaLimite) {
            const diasVencidos = Math.floor((new Date() - fechaLimite) / (1000 * 60 * 60 * 24));
            const interesExtra = diasVencidos * (tasaInteres / 30); // Interés diario acumulado

            return {
                statusCode: 200,
                body: JSON.stringify({
                    prestamo,
                    interes_extra: interesExtra
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(prestamo)
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del servidor', details: error.message })
        };
    }
};
