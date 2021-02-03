const express = require("express");

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

function registerDocs({app, API_TAGS, STATIC_SERVER_BASE_URL, DIR_NAME, name, version}) {
	// * Favicon
	app.get("/img/:img_src", (req, res) => {
		switch(req.params.img_src) {
			case "favicon.png":
			case "favicon-16x16.png":
			case "favicon-32x32.png":
				res.redirect(STATIC_SERVER_BASE_URL + "/img/" + req.params.img_src);
				break;
		}
	});

	// * API Docs
	const SWAGGER_OPTIONS = {
		swaggerDefinition: {
			info: {
				title: name, 
				version, 
				tags: API_TAGS, 
			}
		},
		apis: ["./routes/*.js"]
	};

	const SWAGGER_UI_OPTIONS = {
		customCssUrl: STATIC_SERVER_BASE_URL + "/css/swagger.css", 
		customJs: STATIC_SERVER_BASE_URL + "/js/swagger.js", 
	};

	const SWAGGER_DOCS = swaggerJsDoc(SWAGGER_OPTIONS);

	app.use("/docs/api", swaggerUi.serve, swaggerUi.setup(SWAGGER_DOCS, SWAGGER_UI_OPTIONS));

	// * Database Docs
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

	// * Code Coverage
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
	const COVERAGE_DIR = DIR_NAME + "\\coverage";

	walk(COVERAGE_DIR, (err, files) => {
		if(err) throw err;

		files.forEach((file) => {
			let extension = file.split(".");
			extension = extension[extension.length - 1];

			if(extension === "html") {
				file = file.replace(COVERAGE_DIR + "\\", "").replace("\\", "/").replace("\\", "/");

				const ROUTE = "/docs/coverage/" + file;
				const FILE_TO_RENDER = `../coverage/${file}`;

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

module.exports.registerDocs = registerDocs;