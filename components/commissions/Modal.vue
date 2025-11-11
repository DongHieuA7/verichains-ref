<script setup lang="ts">
import BaseModal from '~/components/Modal.vue'

interface Draft {
  project_id?: string
  client_name?: string
  description?: string
  contract_amount?: number | null
  commission_rate?: number | null
  status?: string
}

interface Option { label: string; value: string }

interface Props {
  modelValue: boolean
  title: string
  draft: Draft
  // CommissionForm props
  showProject?: boolean
  projectOptions?: Option[]
  showStatus?: boolean
  statusOptions?: Option[]
  showRate?: boolean
  minRate?: number
  maxRate?: number
  showCalculatedHint?: boolean
  currency?: string
  // Footer buttons
  confirmType?: 'create' | 'save' | 'approve' | 'edit'
  confirmLabel?: string
  cancelLabel?: string
  confirmDisabled?: boolean
  confirmLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showProject: false,
  projectOptions: () => [],
  showStatus: false,
  statusOptions: () => [],
  showRate: false,
  minRate: 0,
  maxRate: 100,
  showCalculatedHint: false,
  currency: 'VND',
  confirmType: 'save',
  confirmLabel: '',
  cancelLabel: '',
  confirmDisabled: false,
  confirmLoading: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:draft', value: Draft): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const localDraft = computed<Draft>({
  get: () => props.draft,
  set: (val) => emit('update:draft', val),
})

const handleDraftUpdate = (val: Draft) => {
  emit('update:draft', val)
}

const onCancel = () => {
  emit('cancel')
  isOpen.value = false
}
</script>

<template>
  <BaseModal v-model="isOpen" :title="title">
    <CommissionsForm
      :model-value="localDraft"
      @update:model-value="handleDraftUpdate"
      :show-project="showProject"
      :project-options="projectOptions"
      :show-status="showStatus"
      :status-options="statusOptions"
      :show-rate="showRate"
      :min-rate="minRate"
      :max-rate="maxRate"
      :show-calculated-hint="showCalculatedHint"
      :currency="currency"
    />
    <template #footer>
      <div class="flex justify-end gap-2">
        <ActionButton type="cancel" :label="cancelLabel || $t('common.cancel')" @click="onCancel" />
        <ActionButton
          :type="confirmType"
          :label="confirmLabel || (confirmType === 'create' ? $t('common.create') : $t('common.save'))"
          :loading="confirmLoading"
          :disabled="confirmDisabled || confirmLoading"
          @click="$emit('confirm')"
        />
      </div>
    </template>
  </BaseModal>
</template>

