require('dotenv').config();
const influx = require('influx');

const config = {
  influx: {
    host: process.env.INFLUX_HOST,
    databaseName: process.env.INFLUX_DATABASE,
    measurement: 'environment',
    schema: [
      {
        measurement: 'environment',
        fields: {
          temp: influx.FieldType.FLOAT,
          humidity: influx.FieldType.FLOAT,
        },
        tags: ['sensor'],
      },
    ],
  },
  mqtt: {
    brokerLocation: process.env.MQTT_HOST,
    brokerTopic: process.env.MQTT_TOPIC,
  },
  outputType: process.env.OUTPUT_TYPE,
};

module.exports = config;