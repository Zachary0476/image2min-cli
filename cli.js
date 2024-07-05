#!/usr/bin/env node
import process from "node:process";
import arrify from "arrify";
import meow from "meow";
import getStdin from "get-stdin";
import imagemin from "imagemin";
import ora from "ora";
import plur from "plur";
import stripIndent from "strip-indent";
import pairs from "lodash.pairs";
import { isUint8Array } from "uint8array-extras";
import fs from "fs";
import path from "path";

const cli = meow(
	`
	Usage
	  $ image2min <path|glob> ... --out-dir=build [--plugin=<name> ...]
	  $ image2min <file> > <output>
	  $ cat <file> | image2min > <output>

	Options
	  --plugin, -p   Override the default plugins
	  --out-dir, -o  Output directory
		--delete2x, -d Delete @2x image

	Examples
	  $ image2min images/* 
	  $ image2min images/* --delete2x
	  $ image2min images/* --out-dir=build
	  $ image2min foo.png > foo-optimized.png
	  $ cat foo.png | image2min > foo-optimized.png
	  $ image2min foo.png --plugin=pngquant > foo-optimized.png
	  $ image2min foo.png --plugin.pngquant.quality=0.1 --plugin.pngquant.quality=0.2 > foo-optimized.png
	  # Non-Windows platforms may support the short CLI syntax for array arguments
	  $ image2min foo.png --plugin.pngquant.quality={0.1,0.2} > foo-optimized.png
	  $ image2min foo.png --plugin.webp.quality=95 --plugin.webp.preset=icon > foo-icon.webp
`,
	{
		importMeta: import.meta,
		flags: {
			plugin: {
				type: "string",
				shortFlag: "p",
				isMultiple: true,
				default: ["gifsicle", "jpegtran", "optipng", "svgo"],
			},
			outDir: {
				type: "string",
				shortFlag: "o",
			},
			delete2x: {
				type: "boolean",
				shortFlag: "d",
			},
		},
	},
);

const requirePlugins = (plugins) =>
	Promise.all(
		plugins.map(async ([plugin, options]) => {
			try {
				const { default: _plugin } = await import(`imagemin-${plugin}`);
				return _plugin(options);
			} catch {
				console.error(
					stripIndent(`
			Unknown plugin: ${plugin}

			Did you forget to install the plugin?
			You can install it with:

			  $ npm install -g imagemin-${plugin}
		`).trim(),
				);

				process.exit(1);
			}
		}),
	);

const normalizePluginOptions = (plugin) => {
	const pluginOptionsMap = {};

	for (const v of arrify(plugin)) {
		Object.assign(
			pluginOptionsMap,
			typeof v === "object"
				? v
				: {
						[v]: {
							quality: [0.6, 0.8],
						},
					},
		);
	}

	return pairs(pluginOptionsMap);
};

const emptyDirSync = (dir) => {
	if (fs.existsSync(dir)) {
		const files = fs.readdirSync(dir);
		files.forEach((file) => {
			const currentPath = path.join(dir, file);
			if (fs.statSync(currentPath).isDirectory()) {
				emptyDirSync(currentPath);
			} else {
				fs.unlinkSync(currentPath);
			}
		});
	}
};

const run = async (input, { outDir, plugin, delete2X } = {}) => {
	const pluginOptions = normalizePluginOptions(plugin);
	const plugins = await requirePlugins(pluginOptions);
	const spinner = ora("Minifying images");

	if (isUint8Array(input)) {
		process.stdout.write(await imagemin.buffer(input, { plugins }));
		return;
	}
	if (!outDir && input.length > 1) {
		console.error(
			`When '-- outDir' is not provided, only one resource path can be provided at a time`,
		);
		return;
	}

	spinner.start();

	let files,
		leftFiles = 0;
	const regx = /^.+@2x\.(png|jpeg|jpg|gif)$/g;
	try {
		files = await imagemin(input, { destination: outDir, plugins });

		if (!outDir) {
			if (fs.statSync(input[0]).isDirectory()) {
				emptyDirSync(input[0]); // Delete all hierarchical files in the original directory while preserving the folder structure
			}
			files.forEach((file) => {
				if (delete2X && regx.test(file.sourcePath)) return; // Remove images@2x
				leftFiles++;
				fs.writeFile(file.sourcePath, file.data, (err) => {
					if (err) {
						console.error(`${file.sourcePath} -- fail!`, err);
					}
				});
			});
		}
	} catch (error) {
		spinner.stop();
		throw error;
	}

	if (!outDir && files.length === 0) {
		return;
	}

	spinner.stop();
	console.log(`${leftFiles} ${plur("image", files.length)} minified`);
};

if (cli.input.length === 0 && process.stdin.isTTY) {
	console.error("Specify at least one file path");
	process.exit(1);
}

await run(
	cli.input.length > 0 ? cli.input : await getStdin.buffer(),
	cli.flags,
);
