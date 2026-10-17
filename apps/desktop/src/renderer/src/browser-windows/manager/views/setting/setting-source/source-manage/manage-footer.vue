<template>
  <ElForm :rules="rules" :model="form" hide-required-asterisk ref="ruleFormRef">
    <div class="flex items-end gap-4">
      <ElFormItem
        class="m-unset flex-1"
        label="标题"
        label-position="top"
        prop="label"
      >
        <Text placeholder="请输入添加的名称" v-model="form.label" />
      </ElFormItem>

      <ElFormItem
        class="m-unset flex-1"
        label="地址"
        label-position="top"
        prop="url"
      >
        <Text placeholder="请输入播放源地址" v-model="form.url" />
      </ElFormItem>

      <Button class="ml-auto" type="primary" @click="handleSubmit">
        添加播放源
      </Button>
    </div>
  </ElForm>
</template>

<script setup lang="ts">
import { ElForm, ElFormItem, FormRules } from "element-plus";
import Button from "@/components/ui/button.vue";
import Text from "@/components/ui/text.vue";
import { getCategory } from "@/services/api";
import eventEmitter from "@/hooks/eventEmitter";
import Loading from "@/components/ui/loading";
import { useConfigStore } from "@manager/stores/useConfigStore";

const { config } = storeToRefs(useConfigStore());
const { addSource } = useConfigStore();

const ruleFormRef = useTemplateRef("ruleFormRef");

//表单
const form = ref({
  label: "",
  url: "",
});

//清空表单
const clearForm = () => {
  form.value = {
    label: "",
    url: "",
  };
};

//提交
const handleSubmit = async () => {
  const res = await ruleFormRef.value?.validate();

  if (!res) return;

  const close = Loading.service();

  try {
    const res = await getCategory(form.value.url);

    if (res.category.size == 0) {
      eventEmitter.emit("error:show", `无法解析${form.value.url}`);
      return;
    }

    addSource(form.value);

    clearForm();

    eventEmitter.emit("success:show", `添加成功`);
  } catch {
    eventEmitter.emit("error:show", `无法解析${form.value.url}`);
  } finally {
    close();
  }
};

//规则
const rules: FormRules = {
  label: {
    trigger: "blur",
    required: true,
    validator(_, value: string, callback) {
      if (value == "") {
        callback("不能为空");
        return;
      }

      const res = config.value.sources.some(item => item.label == value);

      if (res) {
        callback("标题已存在");
        return;
      }

      callback();
    },
  },

  url: {
    trigger: "blur",
    required: true,
    message: "不能为空",
  },
};
</script>

<style scoped lang="scss"></style>
