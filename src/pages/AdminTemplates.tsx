import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

interface Template {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
  description: string;
  content?: any;
}

const categories = ["Resume", "Cover Letter", "Poster", "Business Card", "Social Media", "Flyer"];

async function uploadImage(file: File): Promise<string | null> {
  if (!file) {
    alert("No file selected!");
    return null;
  }
  console.log("Uploading file:", file);
  const fileExt = file.name.split('.').pop();
  if (!fileExt) {
    alert("File must have an extension.");
    return null;
  }
  const fileName = `${Date.now()}.${fileExt}`;
  console.log("Upload path (fileName):", fileName);
  const { data, error } = await supabase.storage
    .from('template-thumbnails')
    .upload(fileName, file, { upsert: true });
  console.log("Upload response data:", data);
  if (error) {
    console.error("Upload error:", error);
    alert("Upload error: " + error.message);
    return null;
  }
  const { data: publicUrlData } = supabase
    .storage
    .from('template-thumbnails')
    .getPublicUrl(fileName);
  console.log("Public URL data:", publicUrlData);
  return publicUrlData?.publicUrl || null;
}

export default function AdminTemplates() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState("");

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from("templates").select("*");
    if (!error) setTemplates(data || []);
  };

  useEffect(() => { fetchTemplates(); }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div className="p-8">You must be signed in to access this page.</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let thumbnailUrl = null;
    if (thumbnail) {
      thumbnailUrl = await uploadImage(thumbnail);
    }
    let parsedContent = null;
    if (content) {
      try {
        parsedContent = JSON.parse(content);
      } catch (err) {
        alert("Invalid JSON in content field.");
        setIsSubmitting(false);
        return;
      }
    }
    if (editId) {
      // Update
      const { error } = await supabase.from("templates").update({
        title, category, description, ...(thumbnailUrl && { thumbnail: thumbnailUrl }), ...(content && { content: parsedContent })
      }).eq("id", editId);
      if (!error) {
        setEditId(null);
        setTitle(""); setCategory(categories[0]); setDescription(""); setThumbnail(null); setContent("");
        fetchTemplates();
      }
    } else {
      // Insert
      const { error } = await supabase.from("templates").insert([
        { title, category, description, thumbnail: thumbnailUrl, ...(content && { content: parsedContent }) }
      ]);
      if (!error) {
        setTitle(""); setCategory(categories[0]); setDescription(""); setThumbnail(null); setContent("");
        fetchTemplates();
      }
    }
    setIsSubmitting(false);
  };

  const handleEdit = (template: Template) => {
    setEditId(template.id);
    setTitle(template.title);
    setCategory(template.category);
    setDescription(template.description);
    setThumbnail(null);
    setContent(template.content ? JSON.stringify(template.content, null, 2) : "");
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this template?")) {
      await supabase.from("templates").delete().eq("id", id);
      fetchTemplates();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Admin: Manage Templates</h1>
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" required className="w-full border p-2 rounded" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border p-2 rounded">
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" required className="w-full border p-2 rounded" />
        <input type="file" accept="image/*" onChange={e => setThumbnail(e.target.files?.[0] || null)} />
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Canvas JSON content (optional)" className="w-full border p-2 rounded font-mono text-xs" rows={6} />
        <Button type="submit" disabled={isSubmitting}>{editId ? "Update" : "Add"} Template</Button>
        {editId && <Button type="button" variant="outline" onClick={() => { setEditId(null); setTitle(""); setCategory(categories[0]); setDescription(""); setThumbnail(null); setContent(""); }}>Cancel Edit</Button>}
      </form>
      <h2 className="text-xl font-semibold mb-4">Existing Templates</h2>
      <ul className="space-y-4">
        {templates.map(t => (
          <li key={t.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <div className="font-bold">{t.title}</div>
              <div className="text-sm text-gray-500">{t.category}</div>
              <div className="text-sm">{t.description}</div>
              {t.thumbnail && <img src={t.thumbnail} alt={t.title} className="h-16 mt-2 rounded" />}
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={() => handleEdit(t)}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}>Delete</Button>
            </div>
          </li>
        ))}
      </ul>
      <Button className="mt-8" variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
    </div>
  );
} 