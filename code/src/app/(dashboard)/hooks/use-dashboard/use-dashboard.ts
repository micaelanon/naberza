"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createTask, fetchTasks, updateTaskStatus } from "@/lib/supabase-tasks";
import type { TaskItem } from "@/lib/tasks";
import type { DashboardView, TaskFormState } from "@/types/dashboard.types";

import {
  formatTodayLabel,
  getActiveTasks,
  getTaskCollections,
  INITIAL_FORM,
  VIEW_META,
} from "./utils/helpers";
import type { UseDashboardReturn } from "./utils/types";

const useDashboard = (): UseDashboardReturn => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<DashboardView>("today");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(INITIAL_FORM);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchTasks();
        setTasks(data);
      } catch (err) {
        console.error("Failed to load tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  const todayLabel = useMemo(() => formatTodayLabel(), []);
  const collections = useMemo(() => getTaskCollections(tasks), [tasks]);
  const activeTasks = useMemo(() => getActiveTasks(activeView, collections), [activeView, collections]);
  const showPersistentRail = activeView === "today" && collections.persistent.length > 0;
  const showPendingList = activeView === "today";

  const handleSelectView = useCallback((view: DashboardView) => {
    setActiveView(view);
  }, []);

  const handleToggleTask = useCallback(async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const newCompleted = !task.completed;
    setTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, completed: newCompleted } : item)));

    const success = await updateTaskStatus(taskId, newCompleted);
    if (!success) {
      setTasks((prev) => prev.map((item) => (item.id === taskId ? { ...item, completed: task.completed } : item)));
    }
  }, [tasks]);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setSubmitError(null);
  }, []);

  const handleCancelCreate = useCallback(() => {
    resetForm();
    setIsCreateOpen(false);
  }, [resetForm]);

  const handleToggleCreate = useCallback(() => {
    setIsCreateOpen((prev) => !prev);
    setSubmitError(null);
  }, []);

  const handleFormChange = useCallback(<K extends keyof TaskFormState>(field: K, value: TaskFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCreateTask = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    const note = form.note.trim();
    const dueLabel = form.dueLabel.trim() || "Sin fecha fija";

    if (!title) {
      setSubmitError("El título es obligatorio.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const created = await createTask({ title, note, priority: form.priority, kind: form.kind, channel: form.channel, dueLabel, completed: false });

    if (!created) {
      setSubmitError("No se pudo crear la tarea.");
      setIsSubmitting(false);
      return;
    }

    setTasks((prev) => [created, ...prev]);
    handleCancelCreate();
    setIsSubmitting(false);
  }, [form, handleCancelCreate]);

  return {
    tasks,
    loading,
    activeView,
    isCreateOpen,
    isSubmitting,
    submitError,
    form,
    todayLabel,
    collections,
    activeTasks,
    showPersistentRail,
    showPendingList,
    viewMeta: VIEW_META[activeView],
    handleSelectView,
    handleToggleTask,
    handleToggleCreate,
    handleFormChange,
    handleCreateTask,
    handleCancelCreate,
  };
};

export default useDashboard;
