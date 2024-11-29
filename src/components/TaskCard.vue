<template>
  <q-card
    class="task-card q-mb-sm cursor-pointer"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="$emit('click', task)"
    @dblclick="$emit('edit', task)"
  >
    <q-card-section class="q-pb-xs">
      <div class="row items-center justify-between">
        <div class="text-subtitle1 text-weight-medium">{{ task.title }}</div>
        <q-menu>
          <q-list style="min-width: 100px">
            <q-item clickable v-close-popup @click="$emit('edit', task)">
              <q-item-section>Edit</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="confirmDelete">
              <q-item-section class="text-negative">Delete</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <!-- Description -->
      <div v-if="task.description" class="text-body2 q-mb-sm text-grey-8">
        {{ truncateText(task.description, 100) }}
      </div>

      <!-- Meta information -->
      <div class="row items-center q-gutter-x-sm">
        <!-- Notes count -->
        <div v-if="task.notes?.length" class="row items-center q-gutter-x-xs">
          <q-icon name="comment" size="xs" />
          <span class="text-caption">{{ task.notes.length }}</span>
        </div>

        <!-- Attachments count -->
        <div
          v-if="task.attachments?.length"
          class="row items-center q-gutter-x-xs"
        >
          <q-icon name="attach_file" size="xs" />
          <span class="text-caption">{{ task.attachments.length }}</span>
        </div>
      </div>
    </q-card-section>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <span class="q-ml-sm">Delete this task?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Delete"
            color="negative"
            @click="handleDelete"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { KanbanTask } from 'src/types/kanban';
import { useKanbanStore } from 'src/stores/kanban';

const $q = useQuasar();
const kanbanStore = useKanbanStore();

const props = defineProps<{
  task: KanbanTask;
}>();

const emit = defineEmits<{
  (e: 'click', task: KanbanTask): void;
  (e: 'edit', task: KanbanTask): void;
  (e: 'dblclick', task: KanbanTask): void;
  (e: 'dragstart', task: KanbanTask, event: DragEvent): void;
  (e: 'dragend', event: DragEvent): void;
}>();

const showDeleteDialog = ref(false);

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const onDragStart = (event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    // Add a dragging class for visual feedback
    const element = event.target as HTMLElement;
    element.classList.add('dragging');
  }
  emit('dragstart', props.task, event);
};

const onDragEnd = (event: DragEvent) => {
  const element = event.target as HTMLElement;
  element.classList.remove('dragging');
  console.log(element);
  emit('dragend', event);
};

const confirmDelete = () => {
  showDeleteDialog.value = true;
};

const handleDelete = async () => {
  try {
    await kanbanStore.deleteTask(props.task.id);
    $q.notify({
      type: 'positive',
      message: 'Task deleted successfully',
      position: 'top',
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to delete task',
      position: 'top',
    });
  }
};
</script>

<style lang="scss">
.task-card {
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
  }

  &.dragging {
    opacity: 0.5;
    transform: scale(0.95);
  }
}
</style>
