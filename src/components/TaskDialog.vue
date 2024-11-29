// src/components/TaskDialog.vue
<template>
  <q-dialog
    v-model="dialogModel"
    persistent
    :maximized="$q.screen.lt.sm"
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="task-dialog">
      <q-bar class="bg-primary text-white">
        <div class="text-subtitle1">
          {{ mode === 'create' ? 'New Task' : 'Edit Task' }}
        </div>
        <q-space />
        <q-btn dense flat icon="close" v-close-popup>
          <q-tooltip>Close</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section class="q-pa-md">
        <q-form @submit="onSubmit" class="q-gutter-md">
          <!-- Title -->
          <q-input
            v-model="localTask.title"
            label="Title"
            :rules="[(val) => !!val || 'Title is required']"
            outlined
            autofocus
          />

          <!-- Description -->
          <q-input
            v-model="localTask.description"
            type="textarea"
            label="Description"
            outlined
            autogrow
            :rows="3"
          />

          <div class="row q-col-gutter-sm">
            <!-- Column Selection -->
            <div class="col-12 col-sm-6">
              <q-select
                v-model="localTask.columnId"
                :options="columnOptions"
                label="Column"
                outlined
                emit-value
                map-options
                :rules="[(val) => !!val || 'Column is required']"
              />
            </div>

            <!-- Swimlane Selection -->
            <div class="col-12 col-sm-6">
              <q-select
                v-model="localTask.swimlaneId"
                :options="swimlaneOptions"
                label="Swimlane"
                outlined
                emit-value
                map-options
                :rules="[(val) => !!val || 'Swimlane is required']"
              />
            </div>
          </div>

          <!-- Notes Section -->
          <q-expansion-item
            group="task-sections"
            icon="notes"
            label="Notes"
            default-opened
          >
            <q-card>
              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">Add Note</div>
                <div class="row q-col-gutter-sm">
                  <q-input
                    v-model="newNote"
                    label="Note"
                    outlined
                    class="col"
                    @keyup.enter="addNote"
                  >
                    <template v-slot:append>
                      <q-btn
                        round
                        dense
                        flat
                        icon="add"
                        @click="addNote"
                        :disable="!newNote"
                      />
                    </template>
                  </q-input>
                </div>

                <q-list v-if="localTask.notes?.length" class="q-mt-md">
                  <q-item v-for="note in localTask.notes" :key="note.id">
                    <q-item-section>
                      <q-item-label>{{ note.text }}</q-item-label>
                      <q-item-label caption>
                        {{ new Date(note.timestamp).toLocaleString() }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        @click="removeNote(note.id)"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </q-expansion-item>

          <!-- Attachments Section -->
          <q-expansion-item
            group="task-sections"
            icon="attach_file"
            label="Attachments"
            default-opened
          >
            <q-card>
              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">Add Attachment</div>
                <q-file
                  v-model="newAttachment"
                  label="Choose file"
                  outlined
                  bottom-slots
                >
                  <template v-slot:append>
                    <q-btn
                      round
                      dense
                      flat
                      icon="upload"
                      @click="uploadAttachment"
                      :disable="!newAttachment"
                    />
                  </template>
                </q-file>

                <q-list v-if="localTask.attachments?.length" class="q-mt-md">
                  <q-item
                    v-for="attachment in localTask.attachments"
                    :key="attachment.id"
                  >
                    <q-item-section>
                      <q-item-label>{{ attachment.fileName }}</q-item-label>
                      <q-item-label caption>
                        {{ new Date(attachment.uploadedAt).toLocaleString() }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        @click="removeAttachment(attachment.id)"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </q-expansion-item>
        </q-form>
      </q-card-section>

      <q-card-actions align="right" class="bg-grey-1">
        <q-btn flat label="Cancel" color="primary" v-close-popup />
        <q-btn
          flat
          :label="mode === 'create' ? 'Create' : 'Save'"
          color="primary"
          @click="onSubmit"
          :loading="saving"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { KanbanTask, KanbanNote, KanbanAttachment } from 'src/types/kanban';
import { useKanbanStore } from 'src/stores/kanban';

const $q = useQuasar();
const kanbanStore = useKanbanStore();

interface Props {
  modelValue: boolean;
  task?: Partial<KanbanTask> | null;
  mode?: 'create' | 'edit';
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  task: null,
  mode: 'create',
});

// const emit = defineEmits<{
//   (e: 'update:modelValue', value: boolean): void;
//   (e: 'save', task: Partial<KanbanTask>): void;
// }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', task: KanbanTask | Partial<KanbanTask>): void;
}>();

// Local state
const currentBoard = ref('your-board-id');
const saving = ref(false);
const newNote = ref('');
const newAttachment = ref<File | null>(null);
const localTask = ref<Partial<KanbanTask>>({
  title: '',
  description: '',
  notes: [],
  attachments: [],
});

// Computed properties
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const columnOptions = computed(
  () =>
    kanbanStore.board?.columns.map((col) => ({
      label: col.name,
      value: col.id,
    })) || []
);

const swimlaneOptions = computed(
  () =>
    kanbanStore.board?.swimlanes.map((swim) => ({
      label: swim.name,
      value: swim.id,
    })) || []
);

// Watchers
watch(
  () => props.task,
  (newTask) => {
    if (newTask) {
      localTask.value = { ...newTask };
    } else {
      localTask.value = {
        title: '',
        description: '',
        notes: [],
        attachments: [],
        boardId: currentBoard.value,
        columnId: kanbanStore.board?.columns[0]?.id,
        swimlaneId: kanbanStore.board?.swimlanes[0]?.id,
      };
    }
  },
  { immediate: true }
);

// Methods
const addNote = () => {
  if (!newNote.value.trim()) return;

  const note: KanbanNote = {
    id: crypto.randomUUID(),
    text: newNote.value,
    timestamp: new Date().toISOString(),
  };

  localTask.value.notes = [...(localTask.value.notes || []), note];
  newNote.value = '';
};

const removeNote = (noteId: string) => {
  if (!localTask.value.notes) return;
  localTask.value.notes = localTask.value.notes.filter(
    (note) => note.id !== noteId
  );
};

const uploadAttachment = async () => {
  if (!newAttachment.value) return;

  try {
    const attachment: KanbanAttachment = {
      id: crypto.randomUUID(),
      fileHash: 'temp-hash', // Would come from your upload service
      fileName: newAttachment.value.name,
      caption: '',
      uploadedAt: new Date().toISOString(),
    };

    localTask.value.attachments = [
      ...(localTask.value.attachments || []),
      attachment,
    ];
    newAttachment.value = null;
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to upload attachment',
    });
  }
};

const removeAttachment = (attachmentId: string) => {
  if (!localTask.value.attachments) return;
  localTask.value.attachments = localTask.value.attachments.filter(
    (att) => att.id !== attachmentId
  );
};

const onSubmit = async () => {
  saving.value = true;
  try {
    if (!localTask.value.title?.trim()) {
      throw new Error('Title is required');
    }

    if (!localTask.value.columnId) {
      throw new Error('Column is required');
    }

    if (!localTask.value.swimlaneId) {
      throw new Error('Swimlane is required');
    }

    // if (!localTask.value.boardId) {
    //   throw new Error('Board is required');
    // }
    localTask.value.boardId = currentBoard.value;

    emit('save', localTask.value);
    dialogModel.value = false;
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to save task',
    });
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss">
.task-dialog {
  min-width: 600px;
  max-width: 95vw;

  // Make dialog full width on mobile
  @media (max-width: 599px) {
    min-width: 100vw;
    width: 100vw;
  }

  // Scrollable content area
  .q-card-section {
    max-height: calc(90vh - 100px);
    overflow-y: auto;
  }

  // Form styling
  .q-form {
    .q-input,
    .q-select {
      width: 100%;
    }
  }

  // Notes and attachments sections
  .q-expansion-item {
    .q-card {
      box-shadow: none;
      border: 1px solid rgba(0, 0, 0, 0.12);
    }
  }

  // File upload area
  .q-file {
    .q-field__append {
      height: 100%;
      padding: 0 4px;
    }
  }

  // Notes list styling
  .notes-list {
    max-height: 200px;
    overflow-y: auto;

    .note-item {
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);

      &:last-child {
        border-bottom: none;
      }
    }
  }

  // Attachments list styling
  .attachments-list {
    max-height: 200px;
    overflow-y: auto;
  }

  // Dialog actions area
  .q-card-actions {
    border-top: 1px solid rgba(0, 0, 0, 0.12);
    padding: 8px 16px;
  }

  // Loading state
  .q-btn--loading {
    .q-btn__content {
      opacity: 0;
    }
  }

  // Transitions
  .q-transition--slide-up,
  .q-transition--slide-down {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  // Custom scrollbar
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
}

// Dark mode support (optional)
.body--dark {
  .task-dialog {
    .q-expansion-item {
      .q-card {
        border-color: rgba(255, 255, 255, 0.12);
      }
    }

    .notes-list {
      .note-item {
        border-color: rgba(255, 255, 255, 0.08);
      }
    }

    .q-card-actions {
      border-color: rgba(255, 255, 255, 0.12);
    }

    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
}
</style>
