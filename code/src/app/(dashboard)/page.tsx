"use client";

import ConfirmModal from "./_components/confirm-modal";
import CreateTaskPanel from "./_components/create-task-panel";
import DashboardSidebar from "./_components/dashboard-sidebar";
import DashboardTopbar from "./_components/dashboard-topbar";
import PersistentTasksSection from "./_components/persistent-tasks-section";
import TaskListSection from "./_components/task-list-section";
import useDashboard from "./hooks/use-dashboard";
import "./page.css";

export default function DashboardPage() {
  const {
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
    viewMeta,
    showDiscardModal,
    handleSelectView,
    handleToggleTask,
    handleToggleCreate,
    handleFormChange,
    handleCreateTask,
    handleCancelCreate,
    handleConfirmDiscard,
    handleCancelDiscard,
  } = useDashboard();

  return (
    <main className="dashboard-page">
      <DashboardSidebar activeView={activeView} onSelectView={handleSelectView} />

      <section className="dashboard-page__canvas">
        <DashboardTopbar
          viewMeta={viewMeta}
          activeView={activeView}
          todayLabel={todayLabel}
          isCreateOpen={isCreateOpen}
          onToggleCreate={handleToggleCreate}
        />

        <div className="dashboard-page__content">
          {isCreateOpen && (
            <CreateTaskPanel
              form={form}
              submitError={submitError}
              isSubmitting={isSubmitting}
              onChange={handleFormChange}
              onSubmit={handleCreateTask}
              onCancel={handleCancelCreate}
            />
          )}

          {loading && <p className="dashboard-page__empty-state">Cargando tareas...</p>}

          {!loading && showPersistentRail && (
            <PersistentTasksSection
              tasks={collections.persistent}
              onToggleTask={handleToggleTask}
            />
          )}

          {!loading && showPendingList && (
            <TaskListSection
              title="Pendientes"
              count={collections.normal.length}
              emptyText="No hay tareas normales pendientes."
              tasks={collections.normal}
              onToggleTask={handleToggleTask}
            />
          )}

          {!loading && !showPendingList && (
            <TaskListSection
              title={viewMeta.title}
              count={activeTasks.length}
              emptyText={viewMeta.empty}
              tasks={activeTasks}
              showPriorityChip
              onToggleTask={handleToggleTask}
            />
          )}
        </div>
      </section>

      <ConfirmModal
        isOpen={showDiscardModal}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar en el formulario. Si cambias de sección los perderás."
        confirmLabel="Sí, descartar"
        cancelLabel="Seguir editando"
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </main>
  );
}
