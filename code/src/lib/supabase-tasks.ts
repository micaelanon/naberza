import { supabase, isSupabaseEnabled } from "./supabase-client";
import type { TaskItem } from "./tasks";

/**
 * Fetch all tasks from Supabase
 * Falls back to localStorage if Supabase is not available
 */
export async function fetchTasks(): Promise<TaskItem[]> {
  if (!isSupabaseEnabled || !supabase) {
    return getTasksFromLocalStorage();
  }

  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch error:", error);
      return getTasksFromLocalStorage();
    }

    return (
      data?.map((task) => ({
        id: task.id,
        title: task.title,
        note: task.note,
        priority: task.priority as "high" | "medium" | "low",
        kind: task.kind as "persistent" | "normal",
        channel: task.channel as "telegram" | "dashboard",
        dueLabel: task.due_label,
        completed: task.completed,
      })) || []
    );
  } catch (err) {
    console.error("Supabase error:", err);
    return getTasksFromLocalStorage();
  }
}

/**
 * Update task status in Supabase
 * Falls back to localStorage if Supabase is not available
 */
export async function updateTaskStatus(
  taskId: string,
  completed: boolean
): Promise<boolean> {
  if (!isSupabaseEnabled || !supabase) {
    updateTaskInLocalStorage(taskId, completed);
    return true;
  }

  try {
    const { error } = await supabase
      .from("tasks")
      .update({ completed })
      .eq("id", taskId);

    if (error) {
      console.warn("Supabase update error:", error);
      updateTaskInLocalStorage(taskId, completed);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Supabase error:", err);
    updateTaskInLocalStorage(taskId, completed);
    return false;
  }
}

/**
 * Create new task in Supabase
 * Falls back to localStorage if Supabase is not available
 */
export async function createTask(task: Omit<TaskItem, "id">): Promise<TaskItem | null> {
  if (!isSupabaseEnabled || !supabase) {
    return createTaskInLocalStorage(task);
  }

  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          title: task.title,
          note: task.note,
          priority: task.priority,
          kind: task.kind,
          channel: task.channel,
          due_label: task.dueLabel,
          completed: task.completed,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn("Supabase create error:", error);
      return createTaskInLocalStorage(task);
    }

    return {
      id: data.id,
      title: data.title,
      note: data.note,
      priority: data.priority,
      kind: data.kind,
      channel: data.channel,
      dueLabel: data.due_label,
      completed: data.completed,
    };
  } catch (err) {
    console.error("Supabase error:", err);
    return createTaskInLocalStorage(task);
  }
}

// ============= localStorage Fallback =============

const TASKS_STORAGE_KEY = "naBerza_tasks";

function getTasksFromLocalStorage(): TaskItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error("localStorage error:", err);
    return [];
  }
}

function updateTaskInLocalStorage(taskId: string, completed: boolean): void {
  if (typeof window === "undefined") return;

  try {
    const tasks = getTasksFromLocalStorage();
    const updated = tasks.map((task) =>
      task.id === taskId ? { ...task, completed } : task
    );
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("localStorage error:", err);
  }
}

function createTaskInLocalStorage(task: Omit<TaskItem, "id">): TaskItem {
  if (typeof window === "undefined") {
    return { ...task, id: "offline-" + Date.now() };
  }

  try {
    const id = "task-" + Date.now();
    const newTask: TaskItem = { ...task, id };
    const tasks = getTasksFromLocalStorage();
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([...tasks, newTask]));
    return newTask;
  } catch (err) {
    console.error("localStorage error:", err);
    return { ...task, id: "offline-" + Date.now() };
  }
}
