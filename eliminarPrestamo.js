const AWS = require('aws-sdk');

// Inicializar DynamoDB
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const prestamosTable = 'TABLA-PRESTAMOS';

exports.lambdaHandler = async (event) => {
    try {
        // Validar el cuerpo de la solicitud
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Solicitud inválida',
                    details: 'No se encontró el cuerpo de la solicitud'
                })
            };
        }

        // Parsear el cuerpo de la solicitud
        const data = JSON.parse(event.body);
        const { usuario_id, prestamo_id } = data;

        console.log(`Datos recibidos: usuario_id=${usuario_id}, prestamo_id=${prestamo_id}`);

        // Validar los campos requeridos
        if (!usuario_id || !prestamo_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Solicitud inválida',
                    details: 'El usuario_id y el prestamo_id son obligatorios'
                })
            };
        }

        // Validar que el préstamo exista
        const response = await dynamoDb.get({
            TableName: prestamosTable,
            Key: {
                usuario_id: usuario_id,
                prestamo_id: prestamo_id
            }
        }).promise();

        if (!response.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    error: 'Préstamo no encontrado',
                    details: `No se encontró el préstamo con usuario_id ${usuario_id} y prestamo_id ${prestamo_id}`
                })
            };
        }

        // Eliminar el préstamo
        await dynamoDb.delete({
            TableName: prestamosTable,
            Key: {
                usuario_id: usuario_id,
                prestamo_id: prestamo_id
            }
        }).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Préstamo ${prestamo_id} eliminado correctamente`,
                usuario_id: usuario_id,
                prestamo_id: prestamo_id
            })
        };
    } catch (error) {
        console.error(`Error inesperado: ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Error interno al eliminar el préstamo',
                details: error.message
            })
        };
    }
};
