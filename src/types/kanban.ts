export interface KanbanBoard {
  id: string;
  name: string;
  created: string;
  columns: KanbanColumn[];
  swimlanes: KanbanSwimlane[];
}

export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
  created: string;
}

export interface KanbanSwimlane {
  id: string;
  name: string;
  order: number;
  created: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  boardId: string;
  columnId: string;
  swimlaneId: string;
  created: string;
  updated: string;
  notes: KanbanNote[];
  attachments: KanbanAttachment[];
  order: number;
}

export interface KanbanNote {
  id: string;
  timestamp: string;
  text: string;
}

export interface KanbanAttachment {
  id: string;
  fileHash: string;
  fileName: string;
  caption: string;
  uploadedAt: string;
}

// API response types
export interface BoardResponse {
  board: KanbanBoard;
}

export interface TasksResponse {
  tasks: KanbanTask[];
}

export interface TasksData {
  tasks: KanbanTask[];
}
