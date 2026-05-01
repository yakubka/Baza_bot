"use client";
import { useEffect, useState } from "react";
import { fetchStats, type Stats } from "@/lib/api";
import { FolderOpen, FileText, CheckCircle, Database } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-gray-500 mt-1">
          Состояние базы знаний AI-бота BAZA Development
        </p>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">Загружаем статистику...</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          ⚠️ Не удалось подключиться к API: {error}
          <p className="text-sm mt-1 text-red-500">
            Убедитесь, что бэкенд запущен на{" "}
            {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
          </p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            icon={<FolderOpen className="text-blue-500" size={24} />}
            label="Проекты (ЖК)"
            value={stats.projects_count}
            color="blue"
          />
          <StatCard
            icon={<FileText className="text-purple-500" size={24} />}
            label="Документов загружено"
            value={stats.documents_count}
            color="purple"
          />
          <StatCard
            icon={<CheckCircle className="text-green-500" size={24} />}
            label="Проиндексировано"
            value={stats.indexed_documents}
            color="green"
          />
          <StatCard
            icon={<Database className="text-orange-500" size={24} />}
            label="Чанков в базе"
            value={stats.total_chunks}
            color="orange"
          />
        </div>
      )}

      {/* Подсказки */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Как начать работу</h2>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            Перейдите в <strong className="mx-1">«Проекты (ЖК)»</strong> и добавьте ваши жилые комплексы
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            В разделе <strong className="mx-1">«Документы»</strong> загрузите PDF, DOCX или Excel-файлы с базой знаний
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            Документы автоматически обработаются — дождитесь статуса <strong className="mx-1">«Проиндексирован»</strong>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            Бот готов отвечать на вопросы партнёров в Telegram!
          </li>
        </ol>
      </div>

      {/* Поддерживаемые форматы */}
      <div className="mt-6 bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Поддерживаемые форматы документов</h2>
        <div className="flex flex-wrap gap-2">
          {["PDF (текст)", "PDF (сканы/изображения — OCR)", "DOCX / DOC", "XLSX / XLS", "TXT / MD"].map(fmt => (
            <span key={fmt} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-600">
              {fmt}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          PDF-файлы без текста (сканы, презентации как картинки) автоматически OCR-ируются через Gemini Vision.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const bgColors: Record<string, string> = {
    blue: "bg-blue-50",
    purple: "bg-purple-50",
    green: "bg-green-50",
    orange: "bg-orange-50",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className={`w-10 h-10 ${bgColors[color]} rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}
