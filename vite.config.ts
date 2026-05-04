import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	plugins: [react()],
	clearScreen: false,
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host ? {
			protocol: 'ws',
			host,
			port: 1421,
		} : undefined,
		watch: {
			ignored: ['**/src-tauro/**']
		}
	},
	envPrefix: ['VITE_', 'TAURI_ENV_*'],
	build: {
		target: process.env.TAURI_ENV_PLATFORM == 'windows'
			? 'chrome105'
			: 'safari13',
		minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
		sourcemap: !!process.env.TAURI_ENV_DEBUG,
	}
});
