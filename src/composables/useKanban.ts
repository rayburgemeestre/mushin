import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { api } from 'boot/axios';

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  columnId: string;
  swimlaneId: string;
  created: string;
  updated: string;
}

export function useKanban() {
  const $q = useQuasar();
  const tasks = ref<KanbanTask[]>([]);
  const draggingTask = ref<KanbanTask | null>(null);

  const moveTask = async (
    taskId: string,
    newColumnId: string,
    newSwimlaneId: string
  ) => {
    try {
      // Optimistic update
      const taskIndex = tasks.value.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return;

      const updatedTask = {
        ...tasks.value[taskIndex],
        columnId: newColumnId,
        swimlaneId: newSwimlaneId,
        updated: new Date().toISOString(),
      };

      tasks.value.splice(taskIndex, 1);
      tasks.value.push(updatedTask);

      await api.patch(`/tasks/${taskId}/move`, {
        newColumnId,
        newSwimlaneId,
      });

      $q.notify({
        type: 'positive',
        message: 'Task moved successfully',
      });
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Failed to move task',
      });
      // Revert optimistic update
    }
  };

  return {
    tasks,
    draggingTask,
    moveTask,
  };
}
