import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat.js';
import agentsRoutes from './routes/agents.js';
import skillsRoutes from './routes/skills.js';
import cronRoutes from './routes/cron.js';
import sessionsRoutes from './routes/sessions.js';
import contactsRoutes from './routes/contacts.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/contacts', contactsRoutes);

// Swagger setup
const swaggerDoc = YAML.load('./src/openapi.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

app.get('/', (req, res) => res.send('OpenClaw Backend API running'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
