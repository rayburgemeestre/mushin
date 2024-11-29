// src/pages/KanbanBoard.vue
<template>
  <q-page class="q-pa-md">
    <!-- Board Header -->
    <div class="row q-mb-md items-center">
      <div class="text-h5">{{ board?.name }}</div>
      <q-space />
      <q-btn color="primary" label="New Task" @click="openNewTaskDialog" />
    </div>

    <!-- Swimlane Tabs -->
    <q-tabs
      v-model="currentSwimlane"
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="left"
      narrow-indicator
    >
      <q-tab
        v-for="swimlane in board?.swimlanes"
        :key="swimlane.id"
        :name="swimlane.id"
        :label="swimlane.name"
      />
    </q-tabs>

    <!-- Columns and Tasks -->
    <div class="row q-col-gutter-md q-mt-md">
      <div v-for="column in board?.columns" :key="column.id" class="col">
        <q-card class="column-card">
          <q-card-section class="column-header">
            <div class="text-subtitle1">{{ column.name }}</div>
          </q-card-section>

          <q-card-section class="column-content">
            <div
              class="task-container"
              @drop="onDrop($event, column.id)"
              @dragover.prevent
            >
              <task-card
                v-for="task in getTasksByColumnAndSwimlane(
                  column.id,
                  currentSwimlane
                )"
                :key="task.id"
                :task="task"
                @dragstart="onDragStart"
                @edit="editTask(task)"
                @dblclick="editTask(task)"
              />
              <!--@click="editTask(task)"-->
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Task Dialog -->
    <task-dialog
      v-model="showEditTaskDialog"
      :task="editingTask"
      mode="edit"
      @save="saveTask"
    />

    <!-- Separate dialog for new -->
    <task-dialog
      v-model="showNewTaskDialog"
      :task="newTask"
      mode="create"
      @save="createTask"
    />

    <!--    <task-dialog-->
    <!--      v-model="showEditTaskDialog"-->
    <!--      :task="editingTask"-->
    <!--      mode="edit"-->
    <!--      @save="updateTask"-->
    <!--    />-->
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useKanbanStore } from 'src/stores/kanban';
import { KanbanTask } from 'src/types/kanban';
import TaskCard from 'src/components/TaskCard.vue';
import TaskDialog from 'src/components/TaskDialog.vue';

const $q = useQuasar();
const kanbanStore = useKanbanStore();

// Dialog control refs
const showNewTaskDialog = ref(false);
const showEditTaskDialog = ref(false);

// Task state refs
const currentBoard = ref('your-board-id');
const editingTask = ref<KanbanTask | null>(null);
const newTask = ref<Partial<KanbanTask>>({
  title: '',
  description: '',
  columnId: '', // Will be set when dialog opens
  swimlaneId: '', // Will be set when dialog opens
  notes: [],
  attachments: [],
});

const currentSwimlane = ref('');

const board = computed(() => kanbanStore.board);

const getTasksByColumnAndSwimlane = computed(
  () => (columnId: string, swimlaneId: string) =>
    kanbanStore.getTasksByColumnAndSwimlane(columnId, swimlaneId)
);

onMounted(async () => {
  try {
    await kanbanStore.fetchBoard('your-board-id');
    await kanbanStore.fetchTasks('your-board-id');
    if (board.value?.swimlanes.length) {
      currentSwimlane.value = board.value.swimlanes[0].id;
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load board',
    });
  }
});

const onDragStart = (task: KanbanTask, event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('taskId', task.id);
  }
};

const onDrop = async (event: DragEvent, newColumnId: string) => {
  const taskId = event.dataTransfer?.getData('taskId');
  if (!taskId) return;

  try {
    await kanbanStore.moveTask(
      taskId,
      newColumnId,
      currentSwimlane.value,
      // Calculate new order based on position
      0 // You'll need to implement order calculation logic
    );
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to move task',
    });
  }
};

// Dialog handling methods
const openNewTaskDialog = () => {
  // Initialize new task with current swimlane and first column
  newTask.value = {
    ...newTask.value,
    swimlaneId: currentSwimlane.value,
    columnId: board.value?.columns[0]?.id || '',
  };
  showNewTaskDialog.value = true;
};

const createTask = async (task: Partial<KanbanTask>) => {
  try {
    await kanbanStore.createTask({
      ...task,
      boardId: currentBoard.value,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    });
    showNewTaskDialog.value = false;
    $q.notify({
      type: 'positive',
      message: 'Task created successfully',
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to create task',
    });
  }
};

// const updateTask = async (task: Partial<KanbanTask>) => {
//   try {
//     await kanbanStore.updateTask(task);
//     showEditTaskDialog.value = false;
//     $q.notify({
//       type: 'positive',
//       message: 'Task updated successfully'
//     });
//   } catch (error) {
//     $q.notify({
//       type: 'negative',
//       message: 'Failed to update task'
//     });
//   }
// };
//
const editTask = (task: KanbanTask) => {
  editingTask.value = task;
  showEditTaskDialog.value = true;
};

// const saveTask = async (task: KanbanTask) => {
//   // Implementation for saving task
// };
// src/pages/KanbanBoard.vue

const validateTask = (task: Partial<KanbanTask>): boolean => {
  if (!task.title?.trim()) {
    $q.notify({
      type: 'warning',
      message: 'Task title is required',
    });
    return false;
  }

  if (!task.columnId) {
    $q.notify({
      type: 'warning',
      message: 'Column selection is required',
    });
    return false;
  }

  if (!task.swimlaneId) {
    $q.notify({
      type: 'warning',
      message: 'Swimlane selection is required',
    });
    return false;
  }

  if (!task.boardId) {
    $q.notify({
      type: 'warning',
      message: 'Board is required',
    });
    return false;
  }

  return true;
};

const saveTask = async (task: Partial<KanbanTask> | KanbanTask) => {
  let isNewTask = false;
  try {
    if (!validateTask(task)) {
      return;
    }

    isNewTask = !('id' in task);

    if (isNewTask) {
      // early exit if task.columnId is not a string
      if (typeof task.columnId !== 'string') {
        $q.notify({
          type: 'warning',
          message: 'Column selection is required',
        });
        return;
      }
      const newOrder = getLastOrderInColumn(task.columnId);

      await kanbanStore.createTask({
        ...task,
        order: newOrder,
        boardId: currentBoard.value,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      });

      showNewTaskDialog.value = false;
      $q.notify({
        type: 'positive',
        message: 'Task created successfully',
        position: 'top',
      });
    } else {
      await kanbanStore.updateTask({
        ...(task as KanbanTask),
        updated: new Date().toISOString(),
      });

      showEditTaskDialog.value = false;
      $q.notify({
        type: 'positive',
        message: 'Task updated successfully',
        position: 'top',
      });
    }

    // Reset states
    editingTask.value = null;
    newTask.value = {
      title: '',
      description: '',
      columnId: board.value?.columns[0]?.id || '',
      swimlaneId: currentSwimlane.value,
      notes: [],
      attachments: [],
    };

    // Optionally refresh tasks to ensure consistency
    await kanbanStore.fetchTasks(board.value?.id || '');
  } catch (error) {
    console.error('Failed to save task:', error);
    $q.notify({
      type: 'negative',
      message: isNewTask ? 'Failed to create task' : 'Failed to update task',
      position: 'top',
      actions: [{ label: 'Dismiss', color: 'white' }],
    });
  }
};
// Helper method to determine the last order in a column
const getLastOrderInColumn = (columnId: string): number => {
  const tasksInColumn = kanbanStore.getTasksByColumn(columnId);
  if (tasksInColumn.length === 0) return 1000;
  return Math.max(...tasksInColumn.map((t) => t.order)) + 1000;
};
</script>

<style lang="scss">
.column-card {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;

  .column-header {
    background: #f5f5f5;
    padding: 8px 16px;
  }

  .column-content {
    flex-grow: 1;
    overflow-y: auto;
    padding: 8px;
  }

  .task-container {
    min-height: 100%;
    padding: 4px;
  }
}
</style>
