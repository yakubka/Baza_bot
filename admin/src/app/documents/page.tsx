"use client";
import { useEffect, useRef, useState } from "react";
import {
  fetchDocuments,
  fetchProjects,
  uploadDocument,
  deleteDocument,
  type Document,
  type Project,
} from "@/lib/api";
import {
  Upload, Trash2, FileText, FileSpreadsheet, File,
  CheckCircle, Clock, AlertCircle, Loader2, Plus
} from "lucide-react";

const STATUS_CONFIG = {
  indexed: { label: "Проиндексирован", color: "text-green-700 bg-green-50 border-green-200", icon: <CheckCircle size={12} /> },
  processing: { label: "Обрабатывается", color: "text-blue-700 bg-blue-50 border-blue-200", icon: <Loader2 size={12} className="animate-spin" /> },
  pending: { label: "Ожидает", color: "text-yellow-700 bg-yellow-50 border-yellow-200", icon: <Clock size={12} /> },
  error: { label: "Ошибка", color: "text-red-700 bg-red-50 border-red-200", icon: <AlertCircle size={12} /> },
};

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText size={18} className="text-red-500" />,
  xlsx: <FileSpreadsheet size={18} className="text-green-600" />,
  xls: <FileSpreadsheet size={18} className="text-green-600" />,
  docx: <FileText size={18} className="text-blue-500" />,
  doc: <FileText size={18} className="text-blue-500" />,
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<number | "">("");
  const [filterProject, setFilterProject] = useState<number | "">("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    const pid = filterProject !== "" ? (filterProject as number) : undefined;
    fetchDocuments(pid)
      .then(setDocuments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [filterProject]);

  // Auto-refresh для статуса processing
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === "processing");
    if (!hasProcessing) return;
    const timer = setTimeout(load, 3000);
    return () => clearTimeout(timer);
  }, [documents]);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setUploading(true);
    setUploadError(null);

    for (const file of fileArray) {
      try {
        await uploadDocument(file, selectedProject !== "" ? (selectedProject as number) : undefined);
      } catch (e: unknown) {
        setUploadError(e instanceof Error ? e.message : "Ошибка загрузки");
      }
    }

    setUploading(false);
    load();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить документ «${name}»?`)) return;
    try {
      await deleteDocument(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка");
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Документы</h1>
        <p className="text-gray-500 mt-1">Загружайте файлы для обучения бота</p>
      </div>

      {/* Загрузка */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-medium text-gray-900 mb-4">Загрузить документ</h2>

        <div className="flex gap-3 mb-4">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value === "" ? "" : Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
          >
            <option value="">Общая база знаний (без проекта)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Выбрать файл
          </button>
        </div>

        {/* Drag and Drop зона */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragOver
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Загружаем и обрабатываем...</span>
            </div>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600">
                Перетащите файл сюда или <span className="text-blue-600 underline">нажмите для выбора</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Поддерживается: PDF, DOCX, XLSX, TXT (PDF-сканы OCR-ируются автоматически)
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.md"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        {uploadError && (
          <p className="text-red-600 text-sm mt-3 flex items-center gap-1">
            <AlertCircle size={14} /> {uploadError}
          </p>
        )}
      </div>

      {/* Фильтр и список */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <span className="text-sm text-gray-500">Фильтр по проекту:</span>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value === "" ? "" : Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все документы</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <span className="text-sm text-gray-400 ml-auto">{documents.length} документов</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Загружаем...</div>
        ) : error ? (
          <div className="py-12 text-center text-red-500">{error}</div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Документов нет</p>
            <p className="text-gray-400 text-sm mt-1">Загрузите первый документ выше</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {documents.map((doc) => {
              const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
              const icon = FILE_ICONS[doc.file_type] || <File size={18} className="text-gray-400" />;
              return (
                <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {doc.original_name}
                      </span>
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium flex-shrink-0 ${status.color}`}
                      >
                        {status.icon} {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {doc.project_name && <span>📁 {doc.project_name}</span>}
                      <span>{doc.file_type.toUpperCase()}</span>
                      {doc.chunks_count > 0 && <span>{doc.chunks_count} чанков</span>}
                      {doc.error_message && (
                        <span className="text-red-500 truncate max-w-xs" title={doc.error_message}>
                          ⚠️ {doc.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id, doc.original_name)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Удалить"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
