const { join } = require("path");
const Axios = require("axios");
const { readdirSync, createReadStream } = require("fs");
const FormData = require("form-data");
const ms = require("ms");
const Ajv = require("ajv");

const ajv = new Ajv();

let config = {};
try {
  config = require("../config.json");
} catch {
  return console.error("Could not find config");
}

const schema = {
  type: "object",
  required: ["url", "userAgent", "intervals", "uploadKey", "files"],
  additionalProperties: false,
  properties: {
    url: { type: "string" },
    userAgent: { type: "string" },
    intervals: {
      type: "object",
      required: ["amount", "timeout"],
      additionalProperties: false,
      properties: { amount: { type: "integer" }, timeout: { type: "string" } },
    },
    uploadKey: {
      type: "object",
      required: ["name", "value"],
      additionalProperties: false,
      properties: { name: { type: "string" }, value: { type: "string" } },
    },
    files: {
      type: "object",
      required: ["name", "directory"],
      additionalProperties: false,
      properties: { name: { type: "string" }, directory: { type: "string" } },
    },
  },
};

const valid = ajv.validate(schema, config);

if (!valid) return console.error("Config invalid:", ajv.errorsText(ajv.errors));

const path = join(__dirname, "..", config.files.directory);
const imageNames = [];
let iteration = 0;

readdirSync(path).forEach(async (image) => {
  imageNames.push(image);
});

function getNextImages() {
  return imageNames.slice(iteration, (iteration += config.intervals.amount));
}

function upload(images) {
  images.forEach(async (image) => {
    const formData = new FormData();

    formData.append(config.uploadKey.name, config.uploadKey.value);
    formData.append(config.files.name, createReadStream(join(path, image)));

    await Axios({
      url: config.url,
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
        "User-Agent": config.userAgent,
      },
      data: formData,
    })
      .then(() => {
        console.log(`Successfully uploaded ${image}`);
      })
      .catch(() => {
        console.error(`Error uploading ${image}`);
      });
  });
}

async function init() {
  upload(getNextImages());

  setInterval(async () => {
    upload(getNextImages());
  }, ms(config.intervals.timeout));
}

init();
