<template>
  <RouterView />
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import eventEmitter from "./hooks/eventEmitter";

const router = useRouter();

eventEmitter.on("error:show", (message: string) => {
  ElMessage({
    message,
    type: "error",
    duration: 1500,
  });
});

eventEmitter.on("success:show", (message: string) => {
  ElMessage({
    message,
    type: "success",
    duration: 1500,
  });
});

onMounted(() => {
  window.addEventListener("online", () => {
    router.back();
  });

  window.addEventListener("offline", () => {
    router.push("/network");
  });
});
</script>

<style lang="scss"></style>
