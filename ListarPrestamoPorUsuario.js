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
        const { usuario_id } = data;

        if (!usuario_id) {
            return {
                statusCode: 400,
                body: {
                    error: 'Solicitud inválida',
                    details: 'El usuario_id es obligatorio'
                }
            };
        }

        // Consultar préstamos por usuario_id
        const response = await dynamoDb.query({
            TableName: prestamosTable,
            KeyConditionExpression: 'usuario_id = :usuario_id',
            ExpressionAttributeValues: {
                ':usuario_id': usuario_id
            }
        }).promise();

        const prestamos = response.Items || [];

        // Convertir préstamos a tipos serializables
        const prestamosSerializables = decimalToSerializable(prestamos);

        // Verificar si se encontraron préstamos
        if (prestamosSerializables.length === 0) {
            return {
                statusCode: 404,
                body: {
                    message: 'No se encontraron préstamos para el usuario especificado.',
                    usuario_id: usuario_id
                }
            };
        }

        return {
            statusCode: 200,
            body: {
                message: 'Préstamos encontrados',
                usuario_id: usuario_id,
                prestamos: prestamosSerializables
            }
        };
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Error interno del servidor',
                details: error.message
            })
        };
    }
};
