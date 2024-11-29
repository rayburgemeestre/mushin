import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import express from 'express';

import { KanbanBoard, KanbanTask, TasksData, KanbanAttachment } from './types';

interface MoveTaskDto {
  newColumnId: string;
  newSwimlaneId: string;
  newOrder: number;
}

interface TaskParams {
  id: string;
}

interface TaskQuery {
  boardId: string;
}

// Define response types
interface TaskResponse {
  task: KanbanTask;
}

interface ErrorResponse {
  error: string;
}

interface AttachmentResponse {
  attachment: KanbanAttachment;
}

// interface FileRequest extends Request {
//   file: Express.Multer.File | undefined;
//   query: TaskQuery
//   params: TaskParams
// }

const app = express();

const corsDebug = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // console.log('CORS Debug:');
  // console.log('Origin:', req.headers.origin);
  // console.log('Method:', req.method);
  // console.log('Headers:', req.headers);
  next();
};

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:9000',
    'http://127.0.0.1:9000',
    'http://localhost:9001',
    'http://127.0.0.1:9001',
  ], // Allow Quasar dev server
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials: true, // Allow credentials (cookies, authorization headers, etc)
  optionsSuccessStatus: 200, // Some legacy browsers (IE11) choke on 204
};

app.use(express.json());
app.use(corsDebug);
app.use(cors(corsOptions));

const dataDir = path.join(__dirname, '../data');
const uploadsDir = path.join(dataDir, 'uploads');

// ... initialization code remains the same ...

// File-based data storage functions with proper typing
async function readData<T>(filename: string): Promise<T> {
  try {
    const filePath = path.join(dataDir, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (filename.startsWith('tasks-')) {
        return { tasks: [] } as T; // Initialize empty tasks array
      }
      return {} as T;
    }
    throw error;
  }
}

// Ensure our data directories exist
async function initializeDirectories() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Routes with proper typing
app.get('/api/boards/:id', async (req, res) => {
  try {
    const board = await readData<KanbanBoard>(`board-${req.params.id}.json`);
    res.json({ board });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read board data' });
  }
});

app.get('/api/boards/:id/tasks', async (req, res) => {
  try {
    const tasksData = await readData<TasksData>(`tasks-${req.params.id}.json`);
    res.json({ tasks: tasksData.tasks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read tasks data' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const boardId = req.body.boardId;
    const tasksData = await readData<TasksData>(`tasks-${boardId}.json`);

    const newTask: KanbanTask = {
      id: uuidv4(),
      title: req.body.title,
      description: req.body.description,
      boardId: req.body.boardId,
      columnId: req.body.columnId,
      swimlaneId: req.body.swimlaneId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      order: req.body.order,
      notes: [],
      attachments: [],
    };

    tasksData.tasks.push(newTask);
    await writeData(`tasks-${boardId}.json`, tasksData);

    res.json({ task: newTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:taskId', async (req, res) => {
  try {
    const boardId = req.body.boardId;
    const taskId = req.params.taskId;
    const tasksData = await readData<TasksData>(`tasks-${boardId}.json`);

    // Find the task index
    const taskIndex = tasksData.tasks.findIndex((task) => task.id === taskId);

    if (taskIndex === -1) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Update the task while preserving the original id and created date
    const updatedTask: KanbanTask = {
      ...tasksData.tasks[taskIndex], // Keep existing properties
      ...req.body, // Override with new values from request
      id: taskId, // Ensure ID doesn't change
      created: tasksData.tasks[taskIndex].created, // Preserve original creation date
      updated: new Date().toISOString(), // Update the updated timestamp
    };

    tasksData.tasks[taskIndex] = updatedTask;
    await writeData(`tasks-${boardId}.json`, tasksData);

    res.json({ task: updatedTask });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:boardId/:taskId', async (req, res) => {
  try {
    const boardId = req.params.boardId;
    const taskId = req.params.taskId;
    const tasksData = await readData<TasksData>(`tasks-${boardId}.json`);

    const taskIndex = tasksData.tasks.findIndex((task) => task.id === taskId);

    if (taskIndex === -1) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Remove the task from the array
    tasksData.tasks.splice(taskIndex, 1);
    await writeData(`tasks-${boardId}.json`, tasksData);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

interface MoveTaskDto {
  newColumnId: string;
  newSwimlaneId: string;
  newOrder: number;
}

// Update the move task handler with proper response type
const moveTask: RequestHandler<
  TaskParams,
  TaskResponse | ErrorResponse,
  MoveTaskDto,
  TaskQuery
> = async (req, res): Promise<void> => {
  try {
    // const { boardId } = req.query;
    const boardId = 'your-board-id'; //currentBoard.value;
    if (typeof boardId !== 'string') {
      res.status(400).json({ error: 'Invalid board ID' });
      return;
    }

    const tasksData = await readData<TasksData>(`tasks-${boardId}.json`);
    const moveData = req.body;

    const taskIndex = tasksData.tasks.findIndex((t) => t.id === req.params.id);
    if (taskIndex === -1) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    tasksData.tasks[taskIndex] = {
      ...tasksData.tasks[taskIndex],
      columnId: moveData.newColumnId,
      swimlaneId: moveData.newSwimlaneId,
      order: moveData.newOrder,
      updated: new Date().toISOString(),
    };

    await writeData(`tasks-${boardId}.json`, tasksData);
    res.json({ task: tasksData.tasks[taskIndex] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to move task' });
  }
};

// Route registration remains the same
app.patch('/api/tasks/:id/move', moveTask);

import { Request as ExpressRequest, RequestHandler } from 'express';

// Define a custom RequestHandler type that uses our custom types
type CustomRequestHandler = RequestHandler<
  TaskParams,
  AttachmentResponse | ErrorResponse,
  unknown,
  TaskQuery
>;

// Create a type assertion function to help Express understand our types
const createHandler = (handler: CustomRequestHandler): RequestHandler => {
  return (req, res, next) => {
    return handler(
      req as unknown as ExpressRequest<
        TaskParams,
        AttachmentResponse | ErrorResponse,
        unknown,
        TaskQuery
      >,
      res,
      next
    );
  };
};

const uploadAttachment: CustomRequestHandler = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { boardId } = req.query;
    if (typeof boardId !== 'string') {
      res.status(400).json({ error: 'Invalid board ID' });
      return;
    }

    const attachment: KanbanAttachment = {
      id: uuidv4(),
      fileHash: file.filename,
      fileName: file.originalname,
      caption: 'TODO caption',
      uploadedAt: new Date().toISOString(),
    };

    const tasksData = await readData<TasksData>(`tasks-${boardId}.json`);
    const taskIndex = tasksData.tasks.findIndex((t) => t.id === req.params.id);

    if (taskIndex === -1) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    tasksData.tasks[taskIndex].attachments.push(attachment);
    await writeData(`tasks-${boardId}.json`, tasksData);

    res.json({ attachment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

// Use the createHandler helper when registering the route
app.post(
  '/api/tasks/:id/attachments',
  upload.single('file'),
  createHandler(uploadAttachment)
);

app.use('/uploads', express.static(uploadsDir));

// // File-based data storage functions
// async function readData<T>(filename: string): Promise<T> {
//   try {
//     const filePath = path.join(dataDir, filename);
//     const data = await fs.readFile(filePath, 'utf-8');
//     return JSON.parse(data);
//   } catch (error) {
//     if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
//       return {} as T;
//     }
//     throw error;
//   }
// }

async function writeData<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(dataDir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Initialize and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  await initializeDirectories();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
