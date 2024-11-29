// src/stores/kanban.ts
import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import {
  KanbanBoard,
  KanbanTask,
  BoardResponse,
  TasksResponse,
  KanbanAttachment,
  KanbanNote,
} from 'src/types/kanban';

interface KanbanState {
  board: KanbanBoard | null;
  tasks: KanbanTask[];
  loading: boolean;
  error: string | null;
}

export const useKanbanStore = defineStore('kanban', {
  state: (): KanbanState => ({
    board: null,
    tasks: [],
    loading: false,
    error: null,
  }),

  getters: {
    getTasksByColumn: (state) => (columnId: string) =>
      state.tasks.filter((task) => task.columnId === columnId),

    getTasksBySwimlane: (state) => (swimlaneId: string) =>
      state.tasks.filter((task) => task.swimlaneId === swimlaneId),

    getTasksByColumnAndSwimlane:
      (state) => (columnId: string, swimlaneId: string) =>
        state.tasks.filter(
          (task) => task.columnId === columnId && task.swimlaneId === swimlaneId
        ),
  },

  actions: {
    async fetchBoard(boardId: string) {
      this.loading = true;
      try {
        const { data } = await api.get<BoardResponse>(`/api/boards/${boardId}`);
        this.board = data.board;
      } catch (error) {
        this.error = 'Failed to fetch board';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchTasks(boardId: string) {
      this.loading = true;
      try {
        const { data } = await api.get<TasksResponse>(
          `/api/boards/${boardId}/tasks`
        );
        this.tasks = data.tasks;
      } catch (error) {
        this.error = 'Failed to fetch tasks';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createTask(newTask: Partial<KanbanTask>): Promise<KanbanTask> {
      this.loading = true;
      try {
        const { data } = await api.post<{ task: KanbanTask }>(
          '/api/tasks',
          newTask
        );
        // above line, but with added boardId

        // Add to local state
        this.tasks.push(data.task);

        // Sort tasks by order if needed
        this.tasks.sort((a, b) => a.order - b.order);

        return data.task;
      } catch (error) {
        this.error = 'Failed to create task';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateTask(task: Partial<KanbanTask>): Promise<KanbanTask> {
      this.loading = true;
      const taskIndex = this.tasks.findIndex((t) => t.id === task.id);

      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      const originalTask = { ...this.tasks[taskIndex] };

      try {
        // Optimistic update
        // this.tasks[taskIndex] = {
        //   ...task,
        //   updated: new Date().toISOString()
        // };

        const { data } = await api.put<{ task: KanbanTask }>(
          `/api/tasks/${task.id}`,
          task
        );

        // Update with server response
        this.tasks[taskIndex] = data.task;
        return data.task;
      } catch (error) {
        // Revert on failure
        if (taskIndex !== -1) {
          this.tasks[taskIndex] = originalTask;
        }
        this.error = 'Failed to update task';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteTask(taskId: string): Promise<void> {
      this.loading = true;
      const taskIndex = this.tasks.findIndex((t) => t.id === taskId);

      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      const originalTask = { ...this.tasks[taskIndex] };

      try {
        // Optimistic delete
        this.tasks.splice(taskIndex, 1);

        await api.delete(`/api/tasks/${this.board?.id}/${taskId}`);
      } catch (error) {
        // Revert on failure
        this.tasks.splice(taskIndex, 0, originalTask);
        this.error = 'Failed to delete task';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async moveTask(
      taskId: string,
      newColumnId: string,
      newSwimlaneId: string,
      newOrder: number
    ) {
      const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return;

      const originalTask = { ...this.tasks[taskIndex] };

      // Optimistic update
      this.tasks[taskIndex] = {
        ...originalTask,
        columnId: newColumnId,
        swimlaneId: newSwimlaneId,
        order: newOrder,
        updated: new Date().toISOString(),
      };

      try {
        await api.patch(`/api/tasks/${taskId}/move`, {
          newColumnId,
          newSwimlaneId,
          newOrder,
        });

        // Re-sort tasks by order
        this.tasks.sort((a, b) => a.order - b.order);
      } catch (error) {
        // Revert on failure
        this.tasks[taskIndex] = originalTask;
        this.error = 'Failed to move task';
        throw error;
      }
    },

    async addTaskNote(taskId: string, noteText: string) {
      const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return;

      const originalTask = { ...this.tasks[taskIndex] };

      try {
        const { data } = await api.post<{ note: KanbanNote }>(
          `/api/tasks/${taskId}/notes`,
          {
            text: noteText,
          }
        );

        this.tasks[taskIndex] = {
          ...this.tasks[taskIndex],
          notes: [...(this.tasks[taskIndex].notes || []), data.note],
        };
      } catch (error) {
        this.tasks[taskIndex] = originalTask;
        this.error = 'Failed to add note';
        throw error;
      }
    },

    async addTaskAttachment(taskId: string, file: File) {
      const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return;

      const originalTask = { ...this.tasks[taskIndex] };

      try {
        // Create form data for file upload
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post<{ attachment: KanbanAttachment }>(
          `/api/tasks/${taskId}/attachments`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        this.tasks[taskIndex] = {
          ...this.tasks[taskIndex],
          attachments: [
            ...(this.tasks[taskIndex].attachments || []),
            data.attachment,
          ],
        };
      } catch (error) {
        this.tasks[taskIndex] = originalTask;
        this.error = 'Failed to add attachment';
        throw error;
      }
    },
  },
});
