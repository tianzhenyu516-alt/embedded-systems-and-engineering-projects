import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultEnvPath = path.resolve(__dirname, '../../.env');
const configuredEnvPath = process.env.ENV_FILE
    ? path.resolve(process.cwd(), process.env.ENV_FILE)
    : defaultEnvPath;

if (fs.existsSync(configuredEnvPath)) {
    dotenv.config({
        path: configuredEnvPath,
        override: false,
    });
}
