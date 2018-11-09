const influx = require('influx');
const mqtt = require('mqtt');
const config = require('./config');

const logOutput = config.outputType === 'console' ? console.log : () => {};

const setupInfluxWriter = async (influxConfig) => {
  const {host, databaseName, measurement, schema} = { ...influxConfig };
  
  logOutput(`Connecting to InfluxDB at ${host}...`);
  const influxClient = new influx.InfluxDB({
    host: host,
    database: databaseName,
    schema: schema,
  });

  logOutput(`Checking if database '${databaseName}' exists...`);
  const existingDatabases = await influxClient.getDatabaseNames();
  if (!existingDatabases.includes(databaseName)) {
    logOutput(`Database '${databaseName}' created.`);
    await influxClient.createDatabase(databaseName);
  }

  const writeAction = async (measurementObject) => {
    await influxClient.writeMeasurement(measurement, [
      // TODO put this in the config
      {
        fields: {
          temp: measurementObject.temp,
          humidity: measurementObject.humidity,
        },
        tags: { sensor: measurementObject.sensor },
      },
    ]);
  };

  logOutput('Database setup complete.')
  return writeAction;
}

const connectMqtt = (mqttConfig, databaseWriteAction) => {
  const {brokerLocation, brokerTopic} = { ...mqttConfig };

  logOutput(`Connecting to broker at ${brokerLocation}...`);
  const mqttClient = mqtt.connect(brokerLocation);

  const onSubscribe = (error) => {
    logOutput(`Subscribed to '${brokerTopic}', listening for messages...`);
    if (error) {
      logOutput(`Unable to subscribe to ${brokerTopic}`);
      logOutput(error);
    }
  };

  const onConnect = (connack) => {
    logOutput(`Connected to broker at ${brokerLocation}, subscribing to ${brokerTopic}...`);
    mqttClient.subscribe(brokerTopic, onSubscribe);
  };

  const onRecieveMessage = (topic, message) => {
    logOutput(`${topic}: ${message.toString()}`);
    try {
      databaseWriteAction(JSON.parse(message));
    } catch (error) {
      logOutput(`Error writing message: ${error}`);
    }
  };

  mqttClient.on('connect', onConnect);
  mqttClient.on('message', onRecieveMessage);
};

const main = async () => {
  connectMqtt(config.mqtt, await setupInfluxWriter(config.influx));
}

main();