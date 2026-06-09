interface KillDialogProps {
  pid: number;
  processName: string;
  port?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function KillDialog({ pid, processName, port, onConfirm, onCancel }: KillDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 px-6 py-4 border-b border-red-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h2 className="font-semibold text-gray-900">Matar proceso</h2>
              <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-700">
            Estás a punto de terminar el siguiente proceso:
          </p>
          <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1 border border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Proceso</span>
              <span className="font-semibold text-gray-900">{processName || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">PID</span>
              <span className="font-mono text-gray-900">{pid}</span>
            </div>
            {port !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Puerto</span>
                <span className="font-mono text-indigo-700">{port}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 border border-amber-100">
            Si este proceso forma parte del sistema o de otro usuario, podría requerir privilegios de administrador.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sí, matar proceso
          </button>
        </div>
      </div>
    </div>
  );
}
