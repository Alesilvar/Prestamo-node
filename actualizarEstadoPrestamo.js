const AWS = require('aws-sdk');

// Inicializar DynamoDB
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const prestamosTable = 'TABLA-PRESTAMOS';

// Función auxiliar para convertir a JSON serializable
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
        if (!event.body) {
            return {
                statusCode: 400,
                body:{
                    error: 'Solicitud inválida',
                    details: 'No se encontró el cuerpo de la solicitud'
                }
            };
        }

        // Parsear el cuerpo de la solicitud
        const data = JSON.parse(event.body);
        const { usuario_id, prestamo_id, datos: datos_a_actualizar } = data;

        console.log(`Datos recibidos: usuario_id=${usuario_id}, prestamo_id=${prestamo_id}, datos_a_actualizar=${JSON.stringify(datos_a_actualizar)}`);

        // Validar los campos requeridos
        if (!usuario_id || !prestamo_id || !datos_a_actualizar) {
            return {
                statusCode: 400,
                body: {
                    error: 'Solicitud inválida',
                    details: 'El usuario_id, prestamo_id y datos a actualizar son obligatorios'
                }
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
                body: {
                    error: 'Préstamo no encontrado',
                    details: `No se encontró el préstamo con usuario_id ${usuario_id} y prestamo_id ${prestamo_id}`
                }
            };
        }

        // Campos permitidos para la actualización
        const camposPermitidos = [
            'cuenta_id', 'monto', 'descripcion', 'estado', 'plazo',
            'tasa_interes', 'fecha_creacion', 'fecha_vencimiento'
        ];

        // Filtrar los campos permitidos
        const datosFiltrados = Object.keys(datos_a_actualizar)
            .filter(key => camposPermitidos.includes(key))
            .reduce((acc, key) => {
                acc[key] = datos_a_actualizar[key];
                return acc;
            }, {});

        // Validar que haya al menos un campo permitido para actualizar
        if (Object.keys(datosFiltrados).length === 0) {
            return {
                statusCode: 400,
                body: {
                    error: 'No hay campos válidos para actualizar',
                    details: `Campos permitidos: ${camposPermitidos}`
                }
            };
        }

        // Construir la expresión de actualización dinámicamente
        const updateExpressionParts = [];
        const expressionAttributeValues = {};
        const expressionAttributeNames = {};

        Object.entries(datosFiltrados).forEach(([key, value]) => {
            const attributeName = `#${key}`;
            const attributeValue = `:${key}`;
            updateExpressionParts.push(`${attributeName} = ${attributeValue}`);
            expressionAttributeNames[attributeName] = key;
            expressionAttributeValues[attributeValue] = value;
        });

        const updateExpression = `SET ${updateExpressionParts.join(', ')}`;

        // Actualizar los datos en DynamoDB
        await dynamoDb.update({
            TableName: prestamosTable,
            Key: {
                usuario_id: usuario_id,
                prestamo_id: prestamo_id
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        }).promise();

        return {
            statusCode: 200,
            body: {
                message: `Préstamo ${prestamo_id} actualizado correctamente`,
                datos_actualizados: decimalToSerializable(datosFiltrados)
            }
        };
    } catch (error) {
        console.error(`Error inesperado: ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Error interno al actualizar el préstamo',
                details: error.message
            })
        };
    }
};
