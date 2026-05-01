"use client";
import { useEffect, useState } from "react";
import {
  fetchProjects,
  createProject,
  deleteProject,
  type Project,
} from "@/lib/api";
import { Plus, Trash2, Building2, MapPin, X } from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    city: "",
  });

  const load = () => {
    setLoading(true);
    fetchProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) {
      setFormError("Заполните название и slug");
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await createProject(form);
      setForm({ name: "", slug: "", description: "", city: "" });
      setShowForm(false);
      load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Удалить проект «${name}» и все его документы?`)) return;
    try {
      await deleteProject(id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[а-яё]/g, (ch) => {
        const map: Record<string, string> = {
          а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",
          и:"i",й:"j",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",
          с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",
          ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
        };
        return map[ch] || ch;
      })
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setForm(f => ({ ...f, name, slug }));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Проекты (ЖК)</h1>
          <p className="text-gray-500 mt-1">Управляйте жилыми комплексами и их базой знаний</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Добавить проект
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Модальная форма */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-gray-900 text-lg">Новый проект</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название проекта *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="ЖК Алиса"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (латиница, уникальный) *
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="alisa"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="Екатеринбург"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Краткое описание проекта..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {formError && (
                <p className="text-red-600 text-sm">{formError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? "Создаём..." : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Список проектов */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Загружаем...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Building2 size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Проектов пока нет</p>
          <p className="text-gray-400 text-sm mt-1">Добавьте первый проект, чтобы начать</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-gray-300 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{p.name}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-mono">
                    {p.slug}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  {p.city && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {p.city}
                    </span>
                  )}
                  <span>{p.documents_count} документов</span>
                </div>
                {p.description && (
                  <p className="text-sm text-gray-400 mt-1 truncate">{p.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(p.id, p.name)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                title="Удалить проект"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
