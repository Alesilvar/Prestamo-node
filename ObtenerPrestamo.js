const AWS = require('aws-sdk');

// Inicializar DynamoDB
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const prestamosTable = 'TABLA-PRESTAMOS';

// Función auxiliar para convertir valores a tipos serializables
function decimalToSerializable(obj) {
    if (typeof obj === 'number') {
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map(decimalToSerializable);
    } else if (typeof obj === 'object' && obj !== null) {
        return Object.entries(obj).reduce((acc, [key, value]) => {
            acc[key] = decimalToSerializable(value);
            return acc;
        }, {});
    }
    return obj;
}

exports.lambdaHandler = async (event) => {
    try {
        // Validar el cuerpo de la solicitud
        const data = JSON.parse(event.body);
        const { usuario_id, prestamo_id } = data;

        if (!usuario_id || !prestamo_id) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Solicitud inválida',
                    details: 'El usuario_id y el prestamo_id son obligatorios'
                })
            };
        }

        // Obtener el préstamo de DynamoDB
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
                body: JSON.stringify({ error: 'Préstamo no encontrado' })
            };
        }

        // Convertir el préstamo a tipos serializables
        const prestamo = decimalToSerializable(response.Item);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Préstamo encontrado',
                prestamo: prestamo
            })
        };
    } catch (error) {
        console.error(`Error interno del servidor: ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Error interno del servidor',
                details: error.message
            })
        };
    }
};
