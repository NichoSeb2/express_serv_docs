/* eslint-disable no-undef */
const assert = require("assert");

const axios = require("axios");

const express = require("express");
const app = express();

const path = require("path");

const PORT = 6900;
const STATIC_SERVER_BASE_URL = `http://localhost:${PORT}`;
const API_TAGS = ["TEST"];

const { name, version } = require("../package.json");

const { registerSwagger, registerERB, registerNYC } = require("../index");

describe("docs test", async  () => {
	before(async () => {
		app.set("views", path.join(__dirname, "/views"));
		app.set("view engine", "ejs");

		registerSwagger({app, API_TAGS, STATIC_SERVER_BASE_URL, name, version});
		registerERB({app, STATIC_SERVER_BASE_URL, DIR_NAME: path.join(__dirname, "../"), version});
		registerNYC({app, STATIC_SERVER_BASE_URL, DIR_NAME: path.join(__dirname, "../"), name, version});

		app.use("/css/swagger.css", express.static(path.join(__dirname, "../test/css/sample.min.css")));
		app.use("/js/swagger.js", express.static(path.join(__dirname, "../test/js/sample.js")));
		app.use("/css/erb.css", express.static(path.join(__dirname, "../test/css/sample.min.css")));
		app.use("/js/erb.js", express.static(path.join(__dirname, "../test/js/sample.js")));
		app.use("/css/nyc.css", express.static(path.join(__dirname, "../test/css/sample.min.css")));
		app.use("/js/nyc.js", express.static(path.join(__dirname, "../test/js/sample.js")));

		app.listen(PORT);
	});

	const check = [
		{label: "swagger access", route: "/docs/api"}, 
		{label: "swagger css access", route: "/css/swagger.css"}, 
		{label: "swagger js access", route: "/js/swagger.js"}, 
		{label: "erb access", route: "/docs/database"}, 
		{label: "erb css access", route: "/css/erb.css"}, 
		{label: "erb js access", route: "/js/erb.js"}, 
		{label: "nyc access", route: "/docs/coverage"}, 
		{label: "nyc css access", route: "/css/nyc.css"}, 
		{label: "nyc js access", route: "/js/nyc.js"}, 
	];

	check.forEach(el => {
		it(el.label, async () => {
			await axios.get(STATIC_SERVER_BASE_URL + el.route)
				.then((response) => {
					assert.strictEqual(response.status, 200);
				})
				.catch((error) => {
					throw new Error(`"${el.route}" returned a ${error.response.status} status code`);
				});
		});
	});

	after(async () => {
		process.exit(0);
	});
});