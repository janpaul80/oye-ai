import dotenv from 'dotenv';
import path from 'path';

// Load environment configurations before any other module is imported to resolve hoisting issues.
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();
