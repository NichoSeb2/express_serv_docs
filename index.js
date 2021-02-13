const express = require("express");

const normalize = require("normalize-path");

const fs = require("fs");
const path = require("path");

const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

function walk(dir, done) {
	var results = [];

	fs.readdir(dir, (err, list) => {
		if(err) return done(err);

		var i = 0;

		(function next() {
			var file = list[i++];

			if(!file) return done(null, results);

			file = path.resolve(dir, file);

			fs.stat(file, (err, stat) => {
				if(stat && stat.isDirectory()) {
					walk(file, (err, res) => {
						results = results.concat(res);
						next();
					});
				} else {
					results.push(file);
					next();
				}
			});
		})();
	});
}

function registerSwagger({app, API_TAGS, STATIC_SERVER_BASE_URL, name, version, routes}) {
	routes.forEach((route, index) => {
		routes[index] = normalize(route);
	});

	const SWAGGER_OPTIONS = {
		swaggerDefinition: {
			info: {
				title: name, 
				version, 
				tags: API_TAGS, 
			}
		},
		apis: routes
	};

	const SWAGGER_UI_OPTIONS = {
		customCssUrl: STATIC_SERVER_BASE_URL + "/css/swagger.css", 
		customJs: STATIC_SERVER_BASE_URL + "/js/swagger.js", 
	};

	const SWAGGER_DOCS = swaggerJsDoc(SWAGGER_OPTIONS);

	app.use("/docs/api", swaggerUi.serve, swaggerUi.setup(SWAGGER_DOCS, SWAGGER_UI_OPTIONS));
}

function registerERB({app, STATIC_SERVER_BASE_URL, DIR_NAME, version}) {
	DIR_NAME = normalize(DIR_NAME);

	// Base file
	const DATABASE_DOCS_FILE = [
		"build/", 
		"images/", 
		"Metro/", 
		"script/", 
		"style/", 
		"vendors/", 
	];

	DATABASE_DOCS_FILE.forEach(file => {
		app.use("/docs/database/" + file, express.static(DIR_NAME + "/database/" + file));
	});

	// Custom css and js injection
	app.get("/docs/database/", (req, res, next) => {
		if(req.originalUrl.slice(-1) != "/") return next();

		res.render("database", {
			STATIC_SERVER_BASE_URL, 
			custom: {
				version
			}
		});
	});

	app.get("/docs/database", (req, res) => {
		res.redirect("/docs/database/");
	});
}

function registerNYC({app, STATIC_SERVER_BASE_URL, DIR_NAME, name, version}) {
	DIR_NAME = normalize(DIR_NAME);

	// Base file
	const CODE_COVERAGE_FILE = [
		"base.css", 
		"block-navigation.js", 
		"prettify.css", 
		"prettify.js", 
		"sort-arrow-sprite.png", 
		"sorter.js", 
	];

	CODE_COVERAGE_FILE.forEach(file => {
		app.use("/docs/coverage/" + file, express.static(DIR_NAME + "/coverage/" + file));
	});

	// Custom css and js injection into multiple html file
	const COVERAGE_DIR = DIR_NAME + "/coverage";

	walk(COVERAGE_DIR, (err, files) => {
		if(err) throw err;

		files.forEach((file) => {
			file = normalize(file);

			let extension = file.split(".");
			extension = extension[extension.length - 1];

			if(extension === "html") {
				file = file.replace(COVERAGE_DIR + "/", "").replace("\\", "/").replace("\\", "/");

				const ROUTE = "/docs/coverage/" + file;
				const FILE_TO_RENDER = `${COVERAGE_DIR}/${file}`;

				if(file === "index.html") {
					app.get("/docs/coverage/", (req, res, next) => {
						if(req.originalUrl.slice(-1) != "/") return next();

						res.render("coverage", {
							STATIC_SERVER_BASE_URL, 
							FILE_TO_RENDER,
							custom: {
								title: name, 
								version
							}
						});
					});

					app.get("/docs/coverage", (req, res) => {
						res.redirect("/docs/coverage/");
					});
				}

				app.get(ROUTE, (req, res) => {
					res.render("coverage", {
						STATIC_SERVER_BASE_URL, 
						FILE_TO_RENDER,
						custom: {
							title: name, 
							version
						}
					});
				});
			}
		});
	});
}

function registerDocs({app, API_TAGS, STATIC_SERVER_BASE_URL, DIR_NAME, name, version, routes}) {
	// * Global Favicon
	app.get("/img/:img_src", (req, res) => {
		switch(req.params.img_src) {
			case "favicon.png":
			case "favicon-16x16.png":
			case "favicon-32x32.png":
				console.log(STATIC_SERVER_BASE_URL + "/img/" + req.params.img_src);
				res.redirect(STATIC_SERVER_BASE_URL + "/img/" + req.params.img_src);
				break;
		}
	});

	registerSwagger({app, API_TAGS, STATIC_SERVER_BASE_URL, name, version, routes});

	registerERB({app, STATIC_SERVER_BASE_URL, DIR_NAME, version});

	registerNYC({app, STATIC_SERVER_BASE_URL, DIR_NAME, name, version});
}

module.exports.registerDocs = registerDocs;

module.exports.registerSwagger = registerSwagger;
module.exports.registerERB = registerERB;
module.exports.registerNYC = registerNYC;